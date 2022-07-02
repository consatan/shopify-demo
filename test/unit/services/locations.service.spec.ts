import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import shopify from '../../../server/utils/shopify.util';
import locationsService from '../../../server/api/services/locations.service';

describe('Locations service', () => {
  chai.use(spy);

  it('should get all locations', async () => {
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
            hasProviousPage: false,
            startCursor: 'abcdefg',
            endCursor: 'hijklmn',
          },
        },
      })
    );

    expect(await locationsService.all()).to.deep.equal({
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
        next: 'next_hijklmn',
        previous: '',
      },
    });

    chai.spy.restore();
  });
});
