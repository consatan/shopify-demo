import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import { Headers } from 'node-fetch';
import util, { Shopify } from '../../../server/utils/shopify.util';
import {
  GraphQLResource,
  MutationPayload,
} from '../../../server/types/shopify/graphql/base';

describe('Shopify Util', () => {
  it('should get legacyResource id', () => {
    expect(util.getLegacyResourceId(123)).to.equal(123);
    expect(util.getLegacyResourceId(null)).to.equal(null);
    expect(util.getLegacyResourceId('gid://shopify/Product/123')).to.equal(123);

    expect(util.getLegacyResourceId('GID://SHOPify/product/123')).to.equal(
      123,
      'ignore case sensitive'
    );

    expect(util.getLegacyResourceId(' gid://shopify/location/321 ')).to.equal(
      321,
      'should trim string'
    );

    expect(util.getLegacyResourceId('gid://shopixx/location/321')).to.equal(
      null,
      'invalid argument'
    );

    expect(util.getLegacyResourceId('321')).to.equal(321, 'string number');
    expect(util.getLegacyResourceId(123.321)).to.equal(null, 'unsupport float');
    expect(util.getLegacyResourceId('123.321')).to.equal(
      null,
      'unsupport string float'
    );

    expect(util.getLegacyResourceId(0x123)).to.equal(
      291,
      'hex in number type is support'
    );

    expect(util.getLegacyResourceId('0x123')).to.equal(
      null,
      'unsupport hex in string type'
    );
  });

  it('should get graphql id', () => {
    expect(util.getGraphQLId(123, GraphQLResource.Product)).to.equal(
      'gid://shopify/Product/123'
    );

    expect(util.getGraphQLId('123', GraphQLResource.Product)).to.equal(
      'gid://shopify/Product/123'
    );

    const gid = 'gid://shopify/location/123';

    expect(util.getGraphQLId(gid, GraphQLResource.Location)).to.equal(gid);

    expect(util.getGraphQLId(gid, GraphQLResource.Product)).to.equal(
      null,
      'resource type no match'
    );

    expect(util.getGraphQLId(null, GraphQLResource.Product)).to.be.null;
  });

  it('should get pagination arguments', () => {
    expect(util.getPaginationArgument(50, 'next_abc')).to.equal(
      'first: 50, after: "abc"'
    );

    expect(util.getPaginationArgument()).to.equal('first: 50');

    expect(util.getPaginationArgument(300, 'prev_abc')).to.equal(
      'last: 250, before: "abc"',
      'limit out of bound, change to 250'
    );

    expect(util.getPaginationArgument(-123, 'next_def')).to.equal(
      'first: 1, after: "def"',
      'limit out of bound, change to 1'
    );

    expect(util.getPaginationArgument(50, 'next__abc')).to.equal(
      'first: 50',
      'cursor invalid'
    );
  });

  it('should get pageinfo', () => {
    expect(
      util.getPageInfo(50, { hasNextPage: true, endCursor: 'abc' })
    ).to.deep.equal({ limit: 50, next: 'next_abc', previous: '' });

    expect(
      util.getPageInfo(50, { hasNextPage: true, hasPreviousPage: true })
    ).to.deep.equal({ limit: 50, next: '', previous: '' });

    expect(
      util.getPageInfo(50, { hasPreviousPage: true, startCursor: 'def' })
    ).to.deep.equal({ limit: 50, next: '', previous: 'prev_def' });

    expect(
      util.getPageInfo(50, {
        hasNextPage: true,
        hasPreviousPage: true,
        endCursor: 'abc',
        startCursor: 'def',
      })
    ).to.deep.equal({ limit: 50, next: 'next_abc', previous: 'prev_def' });

    expect(util.getPageInfo(50, {})).to.deep.equal({
      limit: 50,
      next: '',
      previous: '',
    });

    expect(util.getPageInfo(-123, { hasNextPage: true })).to.deep.equal(
      { limit: -123, next: '', previous: '' },
      'invalid format, but impossible'
    );
  });
});

describe('Shopify GraphQL API', () => {
  chai.use(spy);

  it('should request graphql query api', async () => {
    const spy = async (body: unknown): Promise<unknown> => {
      chai.spy.on(util.graphql, 'query', () =>
        Promise.resolve({
          body,
          headers: new Headers(),
        })
      );

      try {
        return await util.query('');
      } catch (err) {
        throw err;
      } finally {
        expect(util.graphql.query).to.have.been.called();
        chai.spy.restore();
      }
    };

    const mockData = {
      products: [
        {
          id: 'gid://shopify/Product/123',
          handle: 'myhandle',
        },
      ],
    };

    expect(await spy({ data: mockData })).to.deep.equal(mockData);

    try {
      await spy({});
    } catch (err) {
      expect(err.message).to.equal(
        'Unexception GraphQL response',
        'unexpection response'
      );
    }

    try {
      await spy({ errors: [{ message: 'some error' }] });
    } catch (err) {
      expect(err.errors).to.deep.equal(['some error'], 'errors response');
      expect(err.status).to.equal(500);
    }
  });

  it('should request graphql mutation api', async () => {
    const spy = async (
      body: unknown,
      name: keyof typeof MutationPayload,
      fields: string,
      input: unknown
    ): Promise<unknown> => {
      chai.spy.on(util.graphql, 'query', () =>
        Promise.resolve({
          body,
          headers: new Headers(),
        })
      );

      try {
        return await util.mutation(name, fields, input);
      } catch (err) {
        throw err;
      } finally {
        expect(util.graphql.query).to.have.been.called();
        chai.spy.restore();
      }
    };

    const mockData = {
      id: 'gid://shopify/Product/123',
      handle: 'myhandle',
    };

    expect(
      await spy(
        { data: { productCreate: { product: mockData } } },
        'productCreate',
        'product { id handle }',
        {}
      )
    ).to.deep.equal(mockData);

    try {
      await spy({ data: {} }, 'productCreate', '', {});
    } catch (err) {
      expect(err.message).to.equal('Unexception GraphQL mutation response');
    }

    try {
      await spy(
        {
          data: {
            productCreate: {
              userErrors: [
                {
                  message: 'some error',
                },
              ],
            },
          },
        },
        'productCreate',
        '',
        {}
      );
    } catch (err) {
      expect(err.errors).to.deep.equal(['some error']);
    }

    try {
      await spy(
        { data: { productCreate: { someProp: mockData } } },
        'productCreate',
        'product { id handle }',
        {}
      );
    } catch (err) {
      expect(err.message).to.equal(
        'GraphQL mutation response misssing required node'
      );
    }

    try {
      await spy(
        { data: { productCreate: { product: 123 } } },
        'productCreate',
        'product { id handle }',
        {}
      );
    } catch (err) {
      expect(err.message).to.equal(
        'GraphQL mutation response node [product] is not an object'
      );
    }
  });

  it('should throw config missing error', () => {
    const shopifyShop = process.env.SHOPIFY_SHOP;
    try {
      delete process.env.SHOPIFY_SHOP;
      new Shopify();
    } catch (err) {
      process.env.SHOPIFY_SHOP = shopifyShop;
      expect(err.message).to.equal('Missing Shopify API config.');
    }
  });
});
