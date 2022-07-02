import shopify from '../../../utils/shopify.util';

export interface GraphQLQueryResponse {
  data?: {
    [key: string]: unknown;
  };
  errors?: GraphQLError[];
}

export interface GraphQLMutationResponse {
  data?: {
    [key: string]: {
      userErrors?: GraphQLUserError[];
      mediaUserErrors?: GraphQLMediaUserError[];
      priceRuleUserErrors?: GraphQLPriceRuleUserError[];
      [key: string]: unknown;
    };
  };
  errors?: GraphQLError[];
}

// Represents an error in the input of a mutation.
export interface GraphQLUserError {
  // The path to the input field that caused the error.
  field?: string[];
  // The error message.
  message: string;
}

export interface GraphQLMediaUserError extends GraphQLUserError {
  code?: string; // enum
}

export interface GraphQLPriceRuleUserError extends GraphQLUserError {
  code?: string; // enum
}

// Represents an error encountered during the execution of a GraphQL operation.
export interface GraphQLError {
  // A description of the error.
  message?: string;
  // A list of locations in the requested GraphQL document associated with the error.
  locations?: {
    // The line number of a syntax element.
    line: number;
    // The column number of a syntax element.
    column: number;
  }[];
  // A dictionary which services can use however they see fit to provide additional information in errors to clients.
  extensions?: { [key: string]: unknown }[];
  [key: string]: unknown;
}

export interface GraphQLPageInfo {
  startCursor?: string;
  endCursor?: string;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export enum MutationPayload {
  productCreate = 'ProductInput!',
  productUpdate = 'ProductInput!',
  collectionCreate = 'CollectionInput!',
  collectionUpdate = 'CollectionInput!',
}

export enum GraphQLResource {
  Product,
  ProductImage,
  Collection,
  CollectionImage,
  Location,
  ProductVariant,
  Publication,
}

// Specifies the input fields for an image.
export interface ImageInput {
  // The URL of the image. May be a signed upload URL.
  src?: string | null;
  // A globally-unique identifier.
  id?: string | null;
  // A word or phrase to share the nature or contents of an image.
  altText?: string | null;
  [key: string]: unknown;
}

// Base GraphQL class
export abstract class Base {
  /**
   * Send a GraphQL Mutation request
   *
   * @param fields Which fields to return after request
   * @returns An object containing all of `fields` argument
   */
  async mutation(fields: string): Promise<{ [key: string]: unknown }> {
    this.cleanInput(this);
    return await shopify.mutation(this.getPayload(), fields, this);
  }

  /**
   * Clean object's `null`,`undefined` or `empty array` properies
   *
   * @param input Object to clean
   */
  private cleanInput(input: unknown): void {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      const obj = input as { [key: string]: unknown };
      Object.entries(obj).forEach(([k, v]) => {
        if (v === null || v === undefined) {
          delete obj[k];
        } else if (Array.isArray(v)) {
          if (!v.length) {
            delete obj[k];
          } else {
            v.forEach((val) => this.cleanInput(val));
          }
        } else if (typeof v === 'object') {
          this.cleanInput(v);
        }
      });
    }
  }

  abstract getPayload(): keyof typeof MutationPayload;
}
