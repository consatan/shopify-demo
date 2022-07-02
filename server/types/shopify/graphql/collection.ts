import { Base, MutationPayload, ImageInput } from './base';

// Specifies the input fields required to create a collection.
export class CollectionInput extends Base {
  /** @inheritdoc */
  getPayload(): keyof typeof MutationPayload {
    return this.id ? 'collectionUpdate' : 'collectionCreate';
  }

  // Required for creating a new collection.
  title?: string | null;
  // The description of the collection, in HTML format.
  descriptionHtml?: string | null;
  // A unique human-friendly string for the collection. Automatically generated from the collection's title.
  handle?: string | null;
  // Specifies the collection to update or create a new collection if absent.
  id?: string | null;
  // The ID of the corresponding resource in the REST Admin API.
  legacyResourceId?: number | null;
  // The image associated with the collection.
  image?: ImageInput;
  // Initial list of collection products. Only valid with `productCreate` and without rules.
  products?: string[] | null;
  // Initial list of collection publications. Only valid with `productCreate`. This argument is deprecated: Use PublishablePublish instead.
  publications?: CollectionPublicationInput[];
  // Indicates whether a redirect is required after a new handle has been provided. If true, then the old handle is redirected to the new one automatically.
  redirectNewHandle?: boolean | null;
  // The theme template used when viewing the collection in a store.
  templateSuffix?: string | null;
  [key: string]: unknown;
}

// Specifies the publications to which a collection will be published.
export interface CollectionPublicationInput {
  // This argument is deprecated: Use publicationId instead.
  channelHandle?: string;
  // The ID of the channel. This argument is deprecated: Use publicationId instead.
  channelId?: string;
  // The ID of the publication.
  publicationId?: string;
  [key: string]: unknown;
}
