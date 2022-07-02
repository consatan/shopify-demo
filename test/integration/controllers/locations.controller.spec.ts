import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import Server from '../../../server/index';

describe('Locations controller', () => {
  it('should get all locations', function () {
    this.timeout(10000);
    return request(Server)
      .get('/api/v1/locations')
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/)
      .then((r) => {
        expect(r.status).to.equal(200);
        expect(r.body.status).to.equal(200);
        expect(r.body.data).to.be.an('object');
        expect(r.body.errors).to.be.an('array').of.length(0);
        expect(r.body.data.pageInfo).to.be.an('object');
        expect(r.body.data.pageInfo.limit).to.equal(50);
        expect(r.body.data.pageInfo.next).to.equal('');
        expect(r.body.data.pageInfo.previous).to.equal('');

        expect(r.body.data.data).to.be.an('array').of.length(1);

        const data = r.body.data.data[0];
        expect(data).to.have.all.keys([
          'id',
          'name',
          'isActive',
          'country',
          'province',
          'city',
          'address1',
          'address2',
        ]);
        expect(data.id).to.be.a('number');
        expect(data.name).to.be.a('string');
        expect(data.isActive).to.be.a('boolean');

        const isStringOrNull = (v: unknown) =>
          v === null || typeof v === 'string';

        expect(data.country).to.satisfy(isStringOrNull);
        expect(data.province).to.satisfy(isStringOrNull);
        expect(data.city).to.satisfy(isStringOrNull);
        expect(data.address1).to.satisfy(isStringOrNull);
        expect(data.address2).to.satisfy(isStringOrNull);
      });
  });
});
