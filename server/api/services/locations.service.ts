import shopify from '../../utils/shopify.util';
import { PaginationResponse } from '../../common/server';
import { GraphQLPageInfo } from '../../types/shopify/graphql/base';

interface Location {
  id: number;
  isActive: boolean;
  name: string;
  country: string;
  province: string;
  city: string;
  address1: string;
  address2: string;
}

interface LocationsResponse extends PaginationResponse {
  data: { [key: string]: unknown } & Location[];
}

// Shopify locations service
export class LocationsService {
  /**
   * Get a list of inventory locations
   *
   * @param limit Per page limit
   * @param cursor Pagination cursor
   * @returns A list of locations
   */
  async all(limit = 50, cursor = ''): Promise<LocationsResponse> {
    const locations = (
      await shopify.query(`{
      locations(${shopify.getPaginationArgument(limit, cursor)}) {
        nodes {
          id isActive name
          address { country province city address1 address2 }
        }
        ${shopify.graphqlPageInfo}
      }
    }`)
    ).locations as {
      nodes: {
        id: string;
        name: string;
        isActive: boolean;
        address: {
          country: string;
          province: string;
          city: string;
          address1: string;
          address2: string;
        };
      }[];
      pageInfo: GraphQLPageInfo;
    };

    const data: Location[] = [];
    /* istanbul ignore else */
    if (locations && Array.isArray(locations.nodes)) {
      locations.nodes.map((n) => {
        data.push({
          id: shopify.getLegacyResourceId(n.id) as number,
          name: n.name,
          isActive: n.isActive,
          country: n.address.country,
          province: n.address.province,
          city: n.address.city,
          address1: n.address.address1,
          address2: n.address.address2,
        });
      });
    }

    return {
      data: data,
      pageInfo: shopify.getPageInfo(limit, locations.pageInfo),
    } as LocationsResponse;
  }
}

export default new LocationsService();
