import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../../../server/index';
import { v4 as uuidv4 } from 'uuid';
import shopify from '../../../server/utils/shopify.util';
import { CustomCollection } from '@shopify/shopify-api/dist/rest-resources/2022-04';

describe('Collections controller', () => {
  let collectionId = 0;
  const title = 'integration_test_' + uuidv4();

  it('should create a new collection', function () {
    this.timeout(10000);
    return request(Server)
      .post('/api/v1/collections')
      .send({
        title: title,
        published: true,
        descriptionHtml: 'integration test',
        imageSrc:
          'https://burst.shopifycdn.com/photos/7-chakra-bracelet_925x.jpg',
      })
      .set('Accept', 'application/json')
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(200);
        expect(r.body.status).to.equal(200);
        expect(r.body.data).to.be.an('object');
        expect(r.body.errors).to.be.an('array').of.length(0);

        const data = r.body.data;
        expect(data).to.have.all.keys(['id', 'handle', 'url', 'published']);
        expect(data.id).to.be.a('number');
        collectionId = data.id;

        expect(data.handle).to.equal(title);
        expect(data.url).to.equal(
          `https://${shopify.session.shop}/collections/${title}`
        );
        expect(data.published).to.equal(true);
      });
  });

  it('should update exists collection', function () {
    this.timeout(10000);
    return request(Server)
      .put(`/api/v1/collections/${collectionId}`)
      .send({
        title: title + '_update',
        descriptionHtml: 'integration test update',
      })
      .set('Accept', 'application/json')
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .then((r) => {
        expect(r.status).to.equal(200);
        expect(r.body.status).to.equal(200);
        expect(r.body.data).to.be.an('object');
        expect(r.body.errors).to.be.an('array').of.length(0);

        const data = r.body.data;
        expect(data).to.have.all.keys(['id', 'handle', 'url', 'published']);

        expect(data.id).to.equal(collectionId);
        expect(data.handle).to.equal(title);
        expect(data.url).to.equal(
          `https://${shopify.session.shop}/collections/${title}`
        );
        expect(data.published).to.equal(true);
      });
  });

  it('should delete test collection', function () {
    this.timeout(10000);
    const collection = new CustomCollection({ session: shopify.session });
    collection.id = collectionId;
    return collection.delete();
  });
});
