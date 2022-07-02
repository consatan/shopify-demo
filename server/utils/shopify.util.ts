import {
  SessionInterface,
  ApiVersion,
  RequestReturn,
} from '@shopify/shopify-api';
import { Session } from '@shopify/shopify-api/dist/auth/session';
import { GraphqlClient } from '@shopify/shopify-api/dist/clients/graphql';
import { RestClient } from '@shopify/shopify-api/dist/clients/rest';
import { Context } from '@shopify/shopify-api/dist/context';
import {
  MutationPayload,
  GraphQLResource,
  GraphQLPageInfo,
  GraphQLQueryResponse,
  GraphQLMutationResponse,
  GraphQLUserError,
} from '../types/shopify/graphql/base';
import l from '../common/logger';
import { PaginationPageInfo } from '../common/server';

// Shopify GraphQL client
export class Shopify {
  // The maximum number of result nodes per page
  readonly PAGINATION_MAX_SIZE = 250;
  // The minimum number of result nodes per page
  readonly PAGINATION_MIN_SIZE = 1;
  // The cursor prefix of next page
  readonly PAGINATION_CURSOR_NEXT_PREFIX = 'next_';
  // The cursor prefix of previous page
  readonly PAGINATION_CURSOR_PREVIOUS_PREFIX = 'prev_';

  readonly client: RestClient;
  readonly graphql: GraphqlClient;
  readonly session: SessionInterface;
  // Shopify GraphQL pagination pageInfo fixed syntax
  readonly graphqlPageInfo = `pageInfo { endCursor startCursor hasNextPage hasPreviousPage }`;

  constructor() {
    const { SHOPIFY_API_KEY, SHOPIFY_API_TOKEN, SHOPIFY_SHOP } = process.env;
    if (!SHOPIFY_API_KEY || !SHOPIFY_API_TOKEN || !SHOPIFY_SHOP) {
      throw new Error('Missing Shopify API config.');
    }

    Context.API_KEY = SHOPIFY_API_KEY;
    Context.API_VERSION = ApiVersion.April22;

    this.session = new Session('1', SHOPIFY_SHOP, 'active', false);
    this.session.accessToken = SHOPIFY_API_TOKEN;

    this.client = new RestClient(SHOPIFY_SHOP, SHOPIFY_API_TOKEN);
    this.graphql = new GraphqlClient(SHOPIFY_SHOP, SHOPIFY_API_TOKEN);
  }

  // Process GraphQL response common error
  private parseRequestReturn(resp: RequestReturn): { [key: string]: unknown } {
    const body = resp.body as GraphQLQueryResponse | GraphQLMutationResponse;

    if (body.errors) {
      l.error(body.errors, 'graphql request error');
      throw { status: 500, errors: body.errors?.map((err) => err.message) };
    }

    if (!body.data) {
      const msg = 'Unexception GraphQL response';
      l.error(resp, msg);
      throw new Error(msg);
    }

    return body.data;
  }

  /**
   * Sending GraphQL mutation request, then process common response error
   *
   * @param name Mutation payload name
   * @param fields Which fields to return after request
   * @param input Any mutation input variables
   * @returns An object containing all of `fields` argument
   * @todo Compatible all mutation payload. e.g. multiple args, multiple response nodes
   */
  async mutation(
    name: keyof typeof MutationPayload,
    fields: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: any
  ): Promise<{ [key: string]: unknown }> {
    const resp = await this.graphql.query({
      data: {
        query: `mutation ($input: ${MutationPayload[name]}) {
          ${name}(input: $input) {
            ${fields}
            userErrors {
              field
              message
            }
          }
        }`,
        variables: { input },
      },
    });

    const result = this.parseRequestReturn(resp) as {
      [key: string]: {
        userErrors: GraphQLUserError[];
        [key: string]: unknown;
      };
    };

    const data = result?.[name] as {
      userErrors: GraphQLUserError[];
      [key: string]: unknown;
    };

    if (!data) {
      const msg = 'Unexception GraphQL mutation response';
      l.error(resp, msg);
      throw new Error(msg);
    }

    if (data?.userErrors?.length) {
      l.error(data.userErrors, 'mutation user errors');
      throw {
        status: 500,
        errors: data.userErrors.map((err) => err.message),
      };
    }

    const match = fields.match(/^\s*(\w+)\s*{/);
    if (!match || !data?.[match[1]]) {
      const msg = 'GraphQL mutation response misssing required node';
      l.error(resp, msg, fields);
      throw new Error(msg);
    }

    if (typeof data[match[1]] !== 'object' || Array.isArray(data[match[1]])) {
      const msg = `GraphQL mutation response node [${match[1]}] is not an object`;
      l.error(resp, msg, fields, match);
      throw new Error(msg);
    }

    return data[match[1]] as { [key: string]: unknown };
  }

  /**
   * Sending GraphQL query request, then process common response error
   *
   * @param payload Query payload content
   * @param input Any query variables
   * @returns GrphQL query response
   */
  async query(
    payload: string,
    input?: { [key: string]: unknown }
  ): Promise<{ [key: string]: unknown }> {
    const resp = await this.graphql.query({
      data: { query: payload, variables: input },
    });

    return this.parseRequestReturn(resp);
  }

  /**
   * Get GraphQL pagination argument
   *
   * @param limit Per page limit, max 250, min 1, default 50
   * @param cursor Pagination cursor
   * @returns Pagination argument string, e.g. first: 10, after: "currsorstring"
   */
  getPaginationArgument(limit = 50, cursor = ''): string {
    limit = Math.max(
      this.PAGINATION_MIN_SIZE,
      Math.min(limit, this.PAGINATION_MAX_SIZE)
    );

    let args = `first: ${limit}`;
    if (cursor) {
      const regex = new RegExp(
        `^(${this.PAGINATION_CURSOR_NEXT_PREFIX}|${this.PAGINATION_CURSOR_PREVIOUS_PREFIX})([0-9a-z]+)$`,
        'i'
      );

      const match = cursor.match(regex);
      if (match) {
        cursor = match[2];
        if (match[1].toLowerCase() === this.PAGINATION_CURSOR_NEXT_PREFIX) {
          args = `first: ${limit}, after: "${cursor}"`;
        } else {
          args = `last: ${limit}, before: "${cursor}"`;
        }
      }
    }

    return args;
  }

  /**
   * Parse GraphQL pagination pageInfo response to our RESTful pagination
   * pageInfo
   *
   * @param limit Per page limit
   * @param pageInfo GraphQL pagaination pageInfo
   * @returns Our RESTful pagination pageInfo
   */
  getPageInfo(limit: number, pageInfo: GraphQLPageInfo): PaginationPageInfo {
    return {
      limit: limit,
      next: pageInfo.hasNextPage
        ? this.PAGINATION_CURSOR_NEXT_PREFIX + pageInfo.endCursor
        : '',
      previous: pageInfo.hasPreviousPage
        ? this.PAGINATION_CURSOR_PREVIOUS_PREFIX + pageInfo.startCursor
        : '',
    };
  }

  /**
   * Get Shopify RESTful API resource ID
   *
   * @param id Shopify GraphQL API or RESTful API resource ID
   * @returns Shopify RESTful API resource ID, return `null` if is a
   *   invalid Shopify ID
   */
  getLegacyResourceId(id: string | number | null): number | null {
    if (typeof id === 'string') {
      if (Number(id)) {
        // Filter float and hex number
        return id.match(/^\d+$/) ? parseInt(id, 10) : null;
      }

      return (
        Number(id.match(/^\s*gid:\/\/shopify\/[a-z]+\/(\d+)\s*$/i)?.[1]) || null
      );
    } else if (typeof id === 'number') {
      // Filter float, legacy resource id is int64
      return id.toString().match(/^\d+$/) ? id : null;
    }

    return null;
  }

  /**
   * Get Shopify GraphQL resource ID
   *
   * @param id Shopify GraphQL API or RESTful API resource ID
   * @param resourceType Shopify GraphQL API resource type
   * @returns Shopify GraphQL API resource ID, return `null` if is a
   *   invalid Shopify ID
   */
  getGraphQLId(
    id: string | number | null,
    resourceType: GraphQLResource
  ): string | null {
    const type = GraphQLResource[resourceType];
    if (typeof id === 'string' && !Number(id)) {
      // Even if `id` is valid GraphQL ID but not the specified resource type,
      // also return null
      const regex = new RegExp(`^gid://shopify/${type}/\\d+$`, 'i');

      return id.match(regex) ? id : null;
    }

    const legacyResourceId = this.getLegacyResourceId(id);
    if (legacyResourceId) {
      return `gid://shopify/${type}/${legacyResourceId}`;
    }

    return null;
  }
}

export default new Shopify();
