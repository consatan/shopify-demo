import { Base, MutationPayload, ImageInput } from './base';

// Specifies the input fields required to create a product.
export class ProductInput extends Base {
  getPayload(): keyof typeof MutationPayload {
    return this.id ? 'productUpdate' : 'productCreate';
  }

  // The title of the product.
  title: string | null;
  // Specifies the product to update in productUpdate or creates a new product if absent in productCreate.
  id?: string | null;
  // The ID of the corresponding resource in the REST Admin API.
  legacyResourceId?: number | null;
  // A unique human-friendly string for the product. Automatically generated from the product's title.
  handle?: string | null;
  // A description of the product. Supports HTML formatting. This argument is deprecated: Use descriptionHtml instead.
  bodyHtml?: string | null;
  // The IDs of the collections that this product will be added to.
  collectionsToJoin?: string[] | null;
  // The IDs of collections that will no longer include the product.
  collectionsToLeave?: string[] | null;
  // The custom product type specified by the merchant.
  customProductType?: string | null;
  // The description of the product, complete with HTML formatting.
  descriptionHtml?: string | null;
  // Whether the product is a gift card.
  giftCard?: boolean | null;
  // The theme template used when viewing the gift card in a store.
  giftCardTemplateSuffix?: string | null;
  // The images to associate with the product.
  images?: ImageInput[] | null;
  // List of custom product options (maximum of 3 per product).
  options?: string[] | null;
  // A list of the channels where the product is published. This argument is deprecated: Use PublishablePublish instead.
  productPublications?: ProductPublicationInput[] | null;
  // The product type specified by the merchant.
  productType?: string | null;
  // Only products with an active status can be published. This argument is deprecated: Use PublishablePublish instead.
  publishDate?: Date | null;
  // Only products with an active status can be published. This argument is deprecated: Use PublishablePublish instead.
  publishOn?: Date | null;
  // Only products with an active status can be published. This argument is deprecated: Use PublishablePublish instead.
  published?: boolean | null;
  // Only products with an active status can be published. This argument is deprecated: Use PublishablePublish instead.
  publishedAt?: Date | null;
  // Whether a redirect is required after a new handle has been provided. If true, then the old handle is redirected to the new one automatically.
  redirectNewHandle?: boolean | null;
  // Whether the product can only be purchased with a selling plan (subscription). Products that are sold exclusively on subscription can only be created on online stores. If set to true on an already existing product, then the product will be marked unavailable on channels that don't support subscriptions.
  requiresSellingPlan?: boolean | null;
  // A comma separated list tags that have been added to the product.
  tags?: string[] | string | null;
  // The theme template used when viewing the product in a store.
  templateSuffix?: string | null;
  // A list of variants associated with the product.
  variants?: ProductVariantInput[] | null;
  // The name of the product's vendor.
  vendor?: string | null;
  [key: string]: unknown;
}

// Specifies a product variant to create or update.
export interface ProductVariantInput {
  // Specifies the product variant to update or create a new variant if absent.
  id?: string | null;
  // The ID of the corresponding resource in the REST Admin API.
  legacyResourceId?: number | null;
  // The value of the barcode associated with the product.
  barcode?: string | null;
  // The compare-at price of the variant.
  compareAtPrice?: number | null;
  // The ID of the fulfillment service associated with the variant. This argument is deprecated: This field is no longer going to be supported. Fulfillment services will all be opted into SKU sharing in 2023-04.
  fulfillmentServiceId?: string | null;
  // The Harmonized System Code (or HS Tariff Code) for the variant.
  harmonizedSystemCode?: string | null;
  // The ID of the image that's associated with the variant.
  imageId?: string | null;
  // The URL of an image to associate with the variant. This field can only be used through mutations that create product images and must match one of the URLs being created on the product.
  imageSrc?: string | null;
  // Inventory Item associated with the variant, used for unit cost.
  inventoryItem?: InventoryItemInput;
  // The fulfillment service that tracks the number of items in stock for the product variant. If you track the inventory yourself using the admin, then set the value to shopify. Valid values: shopify or the handle of a fulfillment service that has inventory management enabled. This argument is deprecated: Use tracked attribute on inventoryItem instead.
  inventoryManagement?: ProductVariantInventoryManagement;
  // Whether customers are allowed to place an order for the product variant when it's out of stock.
  inventoryPolicy?: ProductVariantInventoryPolicy;
  // Create only field. The inventory quantities at each location where the variant is stocked.
  inventoryQuantities?: InventoryLevelInput[];
  // The URL of the media to associate with the variant. This field can only be used in mutations that create media images and must match one of the URLs being created on the product. This field only accepts one value.
  mediaSrc?: string[];
  // The custom properties that a shop owner uses to define product variants.
  options?: string[];
  // The order of the product variant in the list of product variants. The first position in the list is 1.
  position?: number | null;
  // The price of the variant.
  price?: number | null;
  // Create only required field. Specifies the product on which to create the variant.
  productId?: string | null;
  // Whether the variant requires shipping.
  requiresShipping?: boolean | null;
  // The SKU for the variant.
  sku?: string | null;
  // The tax code associated with the variant.
  taxCode?: string | null;
  // Whether the variant is taxable.
  taxable?: boolean | null;
  // This argument is deprecated: Variant title is not a writable field; it is generated from the selected variant options.
  title?: string | null;
  // The weight of the variant.
  weight?: number | null;
  // The unit of weight that's used to measure the variant.
  weightUnit?: WeightUnit | null;
  [key: string]: unknown;
}

// Specifies the input fields for an inventory item.
export interface InventoryItemInput {
  // Unit cost associated with the inventory item, the currency is the shop's default currency.
  cost?: number;
  // Whether the inventory item is tracked.
  tracked?: boolean;
  [key: string]: unknown;
}

// Specifies the input fields for an inventory level.
export interface InventoryLevelInput {
  // The available quantity of an inventory item at a location.
  availableQuantity: number;
  // The ID of a location.
  locationId: string;
  [key: string]: unknown;
}

// Specifies a publication to which a product will be published.
export interface ProductPublicationInput {
  // This argument is deprecated: Use publicationId instead.
  channelHandle?: string;
  // ID of the channel. This argument is deprecated: Use publicationId instead.
  channelId?: string;
  // ID of the publication.
  publicationId?: string;
  // The date and time that the product was (or will be) published.
  publishDate?: Date;
  [key: string]: unknown;
}

// The valid values for the method of inventory tracking for a product variant.
export enum ProductVariantInventoryManagement {
  // This product variant's inventory is tracked by a third-party fulfillment service.
  fulfillment_service = 'FULFILLMENT_SERVICE',
  // This product variant's inventory is not tracked.
  not_managed = 'NOT_MANAGED',
  // This product variant's inventory is tracked by Shopify. In the unstable API version, this product variant's inventory could also be tracked by both Shopify and a third-party fulfillment service.
  shopify = 'SHOPIFY',
}

// The valid values for the inventory policy of a product variant once it is out of stock.
export enum ProductVariantInventoryPolicy {
  // Customers can buy this product variant after it's out of stock.
  continue = 'CONTINUE',
  // Customers can't buy this product variant after it's out of stock.
  deny = 'DENY',
}

// Units of measurement for weight.
export enum WeightUnit {
  // Metric system unit of mass.
  g = 'GRAMS',
  // 1 kilogram equals 1000 grams.
  kg = 'KILOGRAMS',
  // Imperial system unit of mass.
  lb = 'POUNDS',
  // 1 pound equals 16 ounces.
  oz = 'OUNCES',
}
