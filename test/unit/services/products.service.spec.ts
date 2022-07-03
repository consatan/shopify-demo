import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import util from '../../../server/utils/exceljs.util';
import shopify from '../../../server/utils/shopify.util';
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

  it('should import product from worksheet', async () => {
    chai.spy.on(shopify, 'mutation', (_name, _fields, input) => {
      switch (input.handle) {
        case 'chain-bracelet':
          throw new Error('message');
        case 'leather-anchor':
          throw { errors: 'errors' };
        case 'bangle-bracelet':
          throw { errors: { message: 'errors' } };
        case 'boho-earrings':
          throw { status: 500 };
        default:
          return Promise.resolve({ handle: `${input.handle}_handle` });
      }
    });

    const products = await productsService.import(worksheet, 123, 321);
    chai.spy.restore();
    products.forEach((v) => {
      expect(v.id).to.null;
      expect(v.url).to.null;

      switch (v.handle) {
        case 'chain-bracelet':
          expect(v.errors).to.equal('message');
          break;
        case 'leather-anchor':
          expect(v.errors).to.equal('errors');
          break;
        case 'bangle-bracelet':
          expect(v.errors).to.eq('{"message":"errors"}');
          break;
        case 'boho-earrings':
          expect(v.errors).to.equal('unknown error');
          break;
        default:
          expect(v.errors).to.null;
          expect(v.handle.endsWith('_handle')).to.true;
      }
    });
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
