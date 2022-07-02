import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import util from '../../../server/utils/exceljs.util';
import productsService from '../../../server/api/services/products.service';
import { join } from 'path';
import { Worksheet } from 'exceljs';
import { Product } from '@shopify/shopify-api/dist/rest-resources/2022-04';

describe('Products service', () => {
  chai.use(spy);

  let worksheet: Worksheet;

  before(async () => {
    worksheet = await util.createFromFile(
      join(__dirname, '../data/products.csv')
    );
  });

  it('should parse product from worksheet', async () => {
    const products = productsService.parseProducts(worksheet, 123, 321);
    const actual = (await import('../data/products.json')) as {
      [k: string]: unknown;
    };

    products.forEach((v, k) =>
      expect(v).to.deep.equal(actual[k], v.handle as string)
    );
  });

  it('should overwrite products', async () => {
    chai.spy.on(Product, 'all', async () =>
      Promise.resolve((await import('../data/products.exists.json')).default)
    );

    const products = productsService.parseProducts(worksheet, 123, 321);
    await productsService.productOverwrite(products);

    const actual = (await import('../data/products.overwrite.json')) as {
      [k: string]: unknown;
    };

    products.forEach((v, k) =>
      expect(v).to.deep.equal(actual[k], v.handle as string)
    );

    chai.spy.restore();
  });

  it('should throw argument invalid error', () => {
    try {
      productsService.parseProducts(worksheet, 'gid://shopify/XXX/123');
    } catch (err) {
      expect(err.status).to.equal(400);
      expect(err.message).to.equal('Invalid location_id');
    }

    try {
      productsService.parseProducts(worksheet, undefined, 'gid://shopify/x/23');
    } catch (err) {
      expect(err.status).to.equal(400);
      expect(err.message).to.equal('Invalid collection_id');
    }
  });

  it('should throw multiple option name error', async () => {
    try {
      const worksheet = await util.createFromFile(
        join(__dirname, '../data/products.csv')
      );

      worksheet.getRow(3).getCell('Option1 Name').value = 'Color1';

      productsService.parseProducts(worksheet);
    } catch (err) {
      expect(err.status).to.equal(400);
      expect(err.message).to.equal(
        'Multiple "Option1 Name" ("Color", "Color1") in "chain-bracelet"'
      );
    }
  });
});
