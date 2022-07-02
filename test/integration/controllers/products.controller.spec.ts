import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../../../server/index';
import { join } from 'path';
import { Product } from '@shopify/shopify-api/dist/rest-resources/2022-04';
import shopify from '../../../server/utils/shopify.util';
import { Workbook, Worksheet } from 'exceljs';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs';

describe('Products controller', () => {
  const productIds: number[] = [];
  const handles: string[] = [];
  const tmpFiles: string[] = [];

  const createCsv = async (
    fn: (worksheet: Worksheet) => void
  ): Promise<string> => {
    const workbook = new Workbook();
    const worksheet = await workbook.csv.readFile(
      join(__dirname, '../data/import.csv'),
      { parserOptions: { headers: true } }
    );

    fn(worksheet);
    const path = `${tmpdir()}/${uuidv4()}.csv`;
    await workbook.csv.writeFile(path, { formatterOptions: { headers: true } });
    tmpFiles.push(path);

    return path;
  };

  after(() => {
    // delete tmp file
    tmpFiles.forEach((path) => unlink(path, (err) => err && console.log(err)));
  });

  it('should import products from upload file', async function () {
    this.timeout(20000);
    const r = await request(Server)
      .post('/api/v1/products/import')
      .attach('products', join(__dirname, '../data/import.csv'))
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/);

    expect(r.status).to.equal(200);
    expect(r.body.status).to.equal(200);
    expect(r.body.data).to.be.an('object');
    expect(r.body.errors).to.be.an('array').of.length(0);
    expect(r.body.data.products).to.be.an('array').of.length(2);

    const products = r.body.data.products as { [k: string]: unknown }[];
    products.forEach((product) => {
      expect(product).to.have.all.keys(['id', 'handle', 'url', 'errors']);
      expect(product.id).to.be.a('number');
      productIds.push(product.id as number);

      expect(product.handle).to.be.a('string');
      const handle = product.handle as string;
      handles.push(handle);
      expect(product.url).to.equal(
        `https://${shopify.session.shop}/products/${handle}`
      );
      expect(product.errors).to.be.null;
    });
  });

  it('should import products with overwrite', async function () {
    this.timeout(20000);
    const path = await createCsv((worksheet) => {
      worksheet.getRow(2).getCell('Handle').value = handles[0];
      worksheet.getRow(3).getCell('Handle').value = handles[0];
      worksheet.getRow(4).getCell('Handle').value = handles[1];
      worksheet.getRow(2).getCell('Variant Inventory Qty').value = 3;
    });

    const r = await request(Server)
      .post('/api/v1/products/import?overwrite=true')
      .attach('products', path)
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/);

    expect(r.status).to.equal(200);
    expect(r.body.status).to.equal(200);
    expect(r.body.data).to.be.an('object');
    expect(r.body.errors).to.be.an('array').of.length(0);
    expect(r.body.data.products).to.be.an('array').of.length(2);

    const products = r.body.data.products as { [k: string]: unknown }[];
    products.forEach((product) => {
      expect(product).to.have.all.keys(['id', 'handle', 'url', 'errors']);
      expect(productIds.includes(product.id as number)).to.true;
      expect(handles.includes(product.handle as string)).to.true;
      expect(product.errors).to.be.null;
    });
  });

  it('should delete test import products', function () {
    this.timeout(20000);
    return Promise.all(
      productIds.map((id) => {
        const product = new Product({ session: shopify.session });
        product.id = id;
        return product.delete();
      })
    );
  });

  it('should throw import error', async () => {
    const path = await createCsv((worksheet) => {
      worksheet.getRow(3).getCell('Option1 Name').value = 'Size1';
    });
    await request(Server)
      .post('/api/v1/products/import')
      .attach('products', path)
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(400);
        expect(r.body.status).to.equal(400);
        expect(r.body.data).to.be.an('object');
        expect(r.body.data).to.be.empty;
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.deep.equal([
          'Multiple "Option1 Name" ("Size", "Size1") in "clay-plant-pot"',
        ]);
      });
  });

  it('should throw invalid location_id error', () =>
    request(Server)
      .post('/api/v1/products/import?location_id=abc')
      .attach('products', join(__dirname, '../data/import.csv'))
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(400);
        expect(r.body.status).to.equal(400);
        expect(r.body.data).to.be.an('object');
        expect(r.body.data).to.be.empty;
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.deep.equal([
          'should match pattern "/^gid:\\/\\/shopify\\/Location\\/\\d+$/i"',
          'should be integer',
          'should match exactly one schema in oneOf',
        ]);
      }));

  it('should throw required upload file error', () =>
    request(Server)
      .post('/api/v1/products/import')
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(415);
        expect(r.body.status).to.equal(415);
        expect(r.body.data).to.be.an('object');
        expect(r.body.data).to.be.empty;
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.deep.equal([
          'unsupported media type undefined',
        ]);
      }));

  it('should throw unsupport file type error', () =>
    request(Server)
      .post('/api/v1/products/import')
      .attach('products', __filename)
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(400);
        expect(r.body.status).to.equal(400);
        expect(r.body.data).to.be.an('object');
        expect(r.body.data).to.be.empty;
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.deep.equal(['Unsupport file type.']);
      }));
});
