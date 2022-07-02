import '../../../server/common/env';
import 'mocha';
import chai, { expect } from 'chai';
import spy from 'chai-spies';
import { CustomCollection } from '@shopify/shopify-api/dist/rest-resources/2022-04';
import shopify from '../../../server/utils/shopify.util';
import collectionsService, {
  CollectionRequest,
} from '../../../server/api/services/collections.service';

describe('Collections service', () => {
  chai.use(spy);

  const imageSrc =
    'https://burst.shopifycdn.com/photos/inspired-woman_925x.jpg';

  let originActual: { [k: string]: unknown } = {};
  let actual: { [k: string]: unknown } = {
    title: 'title',
    descriptionHtml: 'cool',
    image: { src: imageSrc },
    products: [
      'gid://shopify/Product/123',
      'gid://shopify/Product/234',
      'gid://shopify/Product/345',
    ],
    publications: [{ publicationId: 'gid://shopify/Publication/456' }],
  };

  const mutationResult: { [k: string]: unknown } = {
    legacyResourceId: 123,
    handle: 'test',
  };

  let publishResult = true;

  beforeEach(() => {
    originActual = JSON.parse(JSON.stringify(actual));
    chai.spy.on(shopify, 'mutation', (_name, _fields, input: unknown) => {
      expect(input).to.deep.equal(actual);
      return Promise.resolve(mutationResult);
    });

    chai.spy.on(CustomCollection.prototype, 'saveAndUpdate', () =>
      Promise.resolve(publishResult)
    );
  });

  afterEach(() => {
    publishResult = true;
    actual = JSON.parse(JSON.stringify(originActual));
    chai.spy.restore();
  });

  it('should create new collection', async () => {
    const data = {
      title: 'title',
      published: true,
      productIds: [123, 234, 345],
      descriptionHtml: 'cool',
      imageSrc: imageSrc,
      publicationId: 456,
    } as { [k: string]: unknown } & CollectionRequest;

    expect(await collectionsService.create(data)).to.deep.equal(
      {
        id: 123,
        handle: 'test',
        url: `https://${shopify.session.shop}/collections/test`,
        published: true,
      },
      'published'
    );

    delete data.imageSrc;
    delete data.publicationId;
    data.published = publishResult = false;
    data.imageId = 'gid://shopify/CollectionImage/123';

    delete actual.publications;
    actual.image = { id: data.imageId };

    expect(await collectionsService.create(data)).to.deep.equal(
      {
        id: 123,
        handle: 'test',
        url: `https://${shopify.session.shop}/collections/test`,
        published: false,
      },
      'unpublished'
    );
  });

  it('should update exists collection', async () => {
    delete actual.publications;
    actual.id = 'gid://shopify/Collection/123';

    const data = {
      title: 'title',
      published: true,
      productIds: [123, 234, 345],
      descriptionHtml: 'cool',
      imageSrc: imageSrc,
    } as { [k: string]: unknown } & CollectionRequest;

    expect(await collectionsService.update(123, data)).to.deep.equal({
      id: 123,
      handle: 'test',
      url: `https://${shopify.session.shop}/collections/test`,
      published: true,
    });
  });
});
