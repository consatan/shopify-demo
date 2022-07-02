import { CustomCollection } from '@shopify/shopify-api/dist/rest-resources/2022-04';
import l from '../../common/logger';
import { CollectionInput } from '../../types/shopify/graphql/collection';
import { GraphQLResource } from '../../types/shopify/graphql/base';
import shopify from '../../utils/shopify.util';

export interface CollectionRequest {
  title: string;
  productIds?: string[] | number[] | null;
  publicationId?: string | number | null;
  published?: boolean | null;
  descriptionHtml?: string | null;
  imageSrc?: string | null;
  imageId?: string | number | null;
}

export interface CollectionResponse {
  id: number;
  handle: string;
  url: string;
  published: boolean;
}

// Shopify collections service
export class CollectionsService {
  // Creates a collection
  async create(data: CollectionRequest): Promise<CollectionResponse> {
    return this.saveAndUpdate(data);
  }

  // Updates a collection
  async update(
    id: string | number,
    data: CollectionRequest
  ): Promise<CollectionResponse> {
    return this.saveAndUpdate(data, id);
  }

  // Create or update a collection
  async saveAndUpdate(
    data: CollectionRequest,
    id?: string | number
  ): Promise<CollectionResponse> {
    const collection = new CollectionInput();
    collection.title = data.title;
    collection.descriptionHtml = data?.descriptionHtml;

    if (id) {
      collection.id = shopify.getGraphQLId(id, GraphQLResource.Collection);
    }

    if (data.imageId) {
      const imageId = shopify.getGraphQLId(
        data.imageId,
        GraphQLResource.CollectionImage
      );

      if (imageId) {
        collection.image = { id: imageId };
      }
    }

    // If collection.image property is exists, skip data.imageSrc
    if (data.imageSrc && !collection.image) {
      collection.image = { src: data.imageSrc };
    }

    const products = [] as string[];
    if (data.productIds) {
      data.productIds.map((id) => {
        const pid = shopify.getGraphQLId(id, GraphQLResource.Product);
        if (pid) {
          products.push(pid);
        }
      });

      if (products) {
        collection.products = products;
      }
    }

    let hasPublication = false;
    if (data.publicationId) {
      const publicationId = shopify.getGraphQLId(
        data.publicationId,
        GraphQLResource.Publication
      );
      if (publicationId) {
        hasPublication = true;
        collection.publications = [{ publicationId: publicationId }];
      }
    }

    try {
      const coll = (await collection.mutation(
        'collection { handle legacyResourceId }'
      )) as {
        handle: string;
        legacyResourceId: number;
      };

      const response: CollectionResponse = {
        id: Number(coll.legacyResourceId),
        handle: coll.handle,
        url: `https://${shopify.session.shop}/collections/${coll.handle}`,
        published: hasPublication,
      };

      if (!hasPublication && data.published) {
        response.published = await this.publish(
          coll.legacyResourceId,
          data.published
        );
      }

      return response;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Publish or unpublish a collection with Shopify RESTful API.
   *
   * Create or update a collection with GraphQL API is simpler, but standard
   * account no permission get the `Publication` resource, so we cannot using
   * GraphQL API to publishing a collection.
   *
   * @param id Shopify collection ID, GraphQL or RESTful API collection ID
   * @param publish Whether to publish this collection
   * @returns Publish or unpublish result
   */
  async publish(id: string | number, publish = true): Promise<boolean> {
    const legacyResourceId = shopify.getLegacyResourceId(id);
    if (legacyResourceId) {
      const collection = new CustomCollection({ session: shopify.session });
      collection.id = legacyResourceId;
      collection.published = publish;

      try {
        await collection.saveAndUpdate();
        return true;
      } catch (err) {
        l.error(err, 'publishing collection failed', id, publish, collection);
      }
    }

    return false;
  }
}

export default new CollectionsService();
