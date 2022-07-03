import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import request from 'supertest';
import Server from '../../../server/index';
import ExpressServer from '../../../server/common/server';
import routes from '../../../server/routes';
import shopify from '../../../server/utils/shopify.util';

describe('Branches coverage fixed', () => {
  chai.use(spy);

  it('should covered error handler', async () => {
    const spy = async (
      errors: unknown,
      message: string | null = 'some wrong'
    ): Promise<request.Response> => {
      chai.spy.on(shopify, 'query', () => {
        throw { message, errors };
      });

      const r = await request(Server)
        .get('/api/v1/locations?limit=5')
        .set('X-API-KEY', process.env.DEMO_API_KEY as string)
        .expect('Content-Type', /json/);

      expect(r.status).to.equal(500);
      expect(r.body.status).to.equal(500);
      expect(r.body.data).to.empty;

      chai.spy.restore();

      return r;
    };

    let r = await spy('errors');
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal('errors', 'errors is string');

    r = await spy(['errors']);
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal('errors', 'errors is string[]');

    r = await spy([{ msg: 'errors' }]);
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal('{"msg":"errors"}', 'errors is object[]');

    r = await spy({ msg: 'errors' }, null);
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal(
      '{"msg":"errors"}',
      'errors is object and message not a string'
    );

    r = await spy({ msg: 'errors' });
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal(
      'some wrong',
      'errors is object but message is a string'
    );

    r = await spy(false, null);
    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal(
      'Unknown server error',
      'unexpect error format'
    );
  });

  it('should mock pagination', async () => {
    chai.spy.on(shopify, 'query', () =>
      Promise.resolve({
        locations: {
          nodes: [
            {
              id: 'gid://shopify/Location/123',
              name: 'location1',
              isActive: true,
              address: {
                country: 'CN',
                province: 'FJ',
                city: 'XM',
                address1: 'addr 1',
                address2: '',
              },
            },
          ],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: true,
            startCursor: 'abcd',
            endCursor: 'hijk',
          },
        },
      })
    );

    const r = await request(Server)
      .get('/api/v1/locations')
      .set('X-API-KEY', process.env.DEMO_API_KEY as string)
      .expect('Content-Type', /json/);
    chai.spy.restore();

    expect(r.status).to.equal(200);
    expect(r.body.status).to.equal(200);
    expect(r.body.data).to.deep.equal({
      data: [
        {
          id: 123,
          name: 'location1',
          isActive: true,
          country: 'CN',
          province: 'FJ',
          city: 'XM',
          address1: 'addr 1',
          address2: '',
        },
      ],
      pageInfo: {
        limit: 50,
        next: 'http://127.0.0.1/api/v1/locations?limit=50&cursor=next_hijk',
        previous: 'http://127.0.0.1/api/v1/locations?limit=50&cursor=prev_abcd',
      },
    });
  });

  it('should working if some env variable missing', async () => {
    import('../../../server/common/env');
    const {
      API_ID,
      LOG_LEVEL,
      REQUEST_LIMIT,
      SESSION_SECRET,
      OPENAPI_SPEC,
      DEMO_API_KEY,
    } = process.env;

    delete process.env.API_ID;
    delete process.env.LOG_LEVEL;
    delete process.env.REQUEST_LIMIT;
    delete process.env.SESSION_SECRET;
    delete process.env.OPENAPI_SPEC;
    delete process.env.DEMO_API_KEY;

    chai.spy.on(shopify, 'query', () => {
      throw { errors: 'errors' };
    });

    const server = new ExpressServer().router(routes).listen(3001);
    const r = await request(server)
      .get('/api/v1/locations?limit=5')
      .set('X-API-KEY', DEMO_API_KEY as string)
      .expect('Content-Type', /json/);

    chai.spy.restore();

    expect(r.status).to.equal(500);
    expect(r.body.status).to.equal(500);
    expect(r.body.data).to.empty;

    expect(r.body.errors).to.be.an('array').length(1);
    expect(r.body.errors[0]).to.equal('errors', 'errors is string');

    process.env = {
      ...process.env,
      API_ID,
      LOG_LEVEL,
      REQUEST_LIMIT,
      SESSION_SECRET,
      OPENAPI_SPEC,
      DEMO_API_KEY,
    };
  });
});
