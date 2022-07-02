import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import shopify from '../../../server/utils/shopify.util';
import { ProductInput } from '../../../server/types/shopify/graphql/product';

describe('Shopify types', () => {
  chai.use(spy);

  beforeEach(() => {
    chai.spy.on(shopify, 'mutation', (_name, _fields, input: unknown) =>
      Promise.resolve(input)
    );
  });

  afterEach(() => {
    chai.spy.restore();
  });

  it('should clean input', async () => {
    const product = new ProductInput();
    product.bodyHtml = null;
    product.title = 'abc';
    product.images = [];
    product.variants = [
      {
        options: ['a', 'b'],
        inventoryQuantities: [],
      },
      {
        options: [],
        weight: 123.23,
        title: null,
      },
    ];

    expect(await product.mutation('')).to.deep.equal(
      {
        title: 'abc',
        variants: [
          {
            options: ['a', 'b'],
          },
          {
            weight: 123.23,
          },
        ],
      },
      'clearn null or empty property'
    );
  });
});
