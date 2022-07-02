import {
  Image,
  Product,
  Variant,
} from '@shopify/shopify-api/dist/rest-resources/2022-04/index.js';
import { Worksheet, Row } from 'exceljs';
import util from '../../utils/exceljs.util';
import shopify from '../../utils/shopify.util';
import l from '../../common/logger';
import { GraphQLResource } from '../../types/shopify/graphql/base';
import {
  ProductInput,
  ProductVariantInput,
  ProductVariantInventoryPolicy,
  WeightUnit,
} from '../../types/shopify/graphql/product';

// Product options interface
interface IOption {
  // option's name
  name: string;
  // option's values
  values: string[];
  [key: string]: unknown;
}

// Import products response
interface ImportResponse {
  // Product id
  id: number | null;
  // Product handle
  handle: string;
  // Product url in shopify
  url: string | null;
  // Create product failed message, if created success, it's `null`
  errors: string | null;
}

// Shopify products service
export class ProductsService {
  /**
   * Use worksheet to import products by GraphQL api.
   *
   * @param worksheet
   * @param locationId Variant inventory location id, if not set, will be
   *   ignore the `Variant Inventory Qty` column
   * @param collectionId Created product will be join this collection
   * @param overwrite Overwriting product details using the import worksheet
   * @returns Promise<ImportResponse[]>
   * @see https://help.shopify.com/en/manual/products/import-export/using-csv#overwriting-product-details-using-an-import-csv-file
   */
  async import(
    worksheet: Worksheet,
    locationId?: string | number,
    collectionId?: string | number,
    overwrite = false
  ): Promise<ImportResponse[]> {
    const productMap = this.parseProducts(worksheet, locationId, collectionId);

    if (overwrite) {
      await this.productOverwrite(productMap);
    }

    const products = [...productMap.values()];

    await Promise.all(
      products.map(async (p) => {
        try {
          const product = (await p.mutation(
            `product { handle legacyResourceId }`
          )) as {
            handle: string;
            legacyResourceId: number;
          };

          p.handle = product.handle;
          p.legacyResourceId = Number(product.legacyResourceId) || null;
        } catch (err) {
          l.error(err, 'create or update product failed', p);
          p.errors = err?.message || err?.errors || 'unknown error';
        }
      })
    );

    return products.map((p) => ({
      id: p.legacyResourceId as number | null,
      handle: p.handle as string,
      url: p.legacyResourceId
        ? `https://${shopify.session.shop}/products/${p.handle}`
        : null,
      errors: p.errors
        ? typeof p.errors === 'string'
          ? p.errors
          : JSON.stringify(p.errors)
        : null,
    }));
  }

  /**
   * Parse worksheet to a map of Shopify GraphQL ProductInput input object
   *
   * @param worksheet
   * @param locationId Variant inventory location id, if not set, will be
   *   ignore the `Variant Inventory Qty` column
   * @param collectionId Created product will be join this collection
   * @returns A map of products, product's handle is map key
   */
  parseProducts(
    worksheet: Worksheet,
    locationId?: string | number,
    collectionId?: string | number
  ): Map<string, ProductInput> {
    const productMap = new Map<string, ProductInput>();

    let gLocationId = null as string | null;
    if (locationId) {
      gLocationId = shopify.getGraphQLId(locationId, GraphQLResource.Location);
      if (!gLocationId) {
        throw { status: 400, message: 'Invalid location_id' };
      }
    }

    let gCollectionId = null as string | null;
    if (collectionId) {
      gCollectionId = shopify.getGraphQLId(
        collectionId,
        GraphQLResource.Collection
      );

      if (!gCollectionId) {
        throw { status: 400, message: 'Invalid collection_id' };
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      // Skipping header row.
      if (rowNumber === 1) {
        return;
      }

      const handle = util.getStringCell(row, 'Handle');
      // Skipping if "Handle" column empty.
      if (handle) {
        const variant: ProductVariantInput = {};
        // If 'Option1 Value' is blank, is an image row, skip fetch variant
        // see https://help.shopify.com/en/manual/products/import-export/using-csv#adding-multiple-product-images-in-a-csv-file
        const isImageRow = util.getStringCell(row, 'Option1 Value') === null;

        if (!isImageRow) {
          variant.sku = util.getStringCell(row, 'Variant SKU');
          variant.taxable = util.getBooleanCell(row, 'Variant Taxable');
          variant.barcode = util.getStringCell(row, 'Variant Barcode');
          variant.taxCode = util.getStringCell(row, 'Variant Tax Code');
          variant.price = util.getNumberCell(row, 'Variant Price');
          variant.imageSrc = util.getStringCell(row, 'Variant Image');

          const weightUnit = util.getStringCell(row, 'Variant Weight Unit');
          if (weightUnit) {
            variant.weightUnit =
              WeightUnit[weightUnit as keyof typeof WeightUnit];
          }

          const policy = util.getStringCell(row, 'Variant Inventory Policy');
          if (policy) {
            variant.inventoryPolicy =
              ProductVariantInventoryPolicy[
                policy as keyof typeof ProductVariantInventoryPolicy
              ];
          }

          // Inventory qty required locationId in GraphQL API
          if (gLocationId) {
            variant.inventoryQuantities = [
              {
                availableQuantity:
                  util.getNumberCell(row, 'Variant Inventory Qty') || 0,
                locationId: gLocationId,
              },
            ];
          }

          variant.requiresShipping = util.getBooleanCell(
            row,
            'Variant Requires Shipping'
          );

          variant.compareAtPrice = util.getNumberCell(
            row,
            'Variant Compare At Price'
          );
        }

        let product = productMap.get(handle);
        if (!product) {
          product = new ProductInput();
          product.handle = handle;
          product.images = [];
          product.options = [];
          product.variants = [];
          // Join the specify collection if provided a collectionId
          if (gCollectionId) {
            product.collectionsToJoin = [gCollectionId];
          }

          productMap.set(handle, product);
        }

        const variantOptions: string[] = [];
        const options = product.options as string[];
        for (let i = 0; i < 3; i++) {
          const name = util.getStringCell(row, `Option${i + 1} Name`);
          const value = util.getStringCell(row, `Option${i + 1} Value`);

          if (name) {
            if (options[i] && options[i] !== name) {
              throw {
                status: 400,
                message: `Multiple "Option${i + 1} Name" ("${
                  options[i]
                }", "${name}") in "${handle}"`,
              };
            }
            options[i] = name;
          }

          if (value) {
            variantOptions[i] = value;
          }
        }

        product.options = options;
        variant.options = variantOptions;
        if (!isImageRow) {
          product.variants?.push(variant);
        }

        const image = util.getStringCell(row, 'Image Src');
        if (image) {
          product.images?.push({ src: image });
        }

        product.title = product.title || util.getStringCell(row, 'Title');
        product.vendor = product.vendor || util.getStringCell(row, 'Vendor');
        product.tags = product.tags || util.getStringCell(row, 'Tags');
        if (typeof product.published === 'undefined') {
          product.published = util.getBooleanCell(row, 'Published');
        }

        product.descriptionHtml =
          product.descriptionHtml || util.getStringCell(row, 'Body (HTML)');

        product.productType =
          product.productType || util.getStringCell(row, 'Type');
      }
    });

    return productMap;
  }

  /**
   * Overwriting product deailt by product's handle
   *
   * @param productMap A map of GraphQL ProductInput input object
   * @see https://help.shopify.com/en/manual/products/import-export/using-csv#overwriting-product-details-using-an-import-csv-file
   */
  async productOverwrite(productMap: Map<string, ProductInput>): Promise<void> {
    // see https://shopify.dev/api/usage/pagination-rest#parameters
    const chunkSize = shopify.PAGINATION_MAX_SIZE;
    const handles = Array.from(productMap.keys());

    for (let i = 0; i < handles.length; i += chunkSize) {
      const products = await Product.all({
        session: shopify.session,
        handle: handles.slice(i, i + chunkSize).join(','),
        limit: chunkSize,
      });

      products.forEach((oldProduct) => {
        const newProduct = productMap.get(
          oldProduct.handle as string
        ) as ProductInput;

        newProduct.id = shopify.getGraphQLId(
          oldProduct.id,
          GraphQLResource.Product
        );

        const oldOptions = oldProduct.options as {
          name: string;
          [key: string]: unknown;
        }[];

        let optionsChanged = false;
        if (oldOptions.length !== newProduct.options?.length) {
          optionsChanged = true;
        } else {
          optionsChanged = newProduct.options.every(
            (v, i) => v !== oldOptions[i].name
          );
        }

        // If options changed, overwrite variants and images, no more merging
        if (!optionsChanged) {
          const oldVariants = oldProduct.variants as Variant[];
          const newVariants = newProduct.variants as ProductVariantInput[];

          oldVariants.forEach((oldVariant) => {
            const oldOptions = [
              oldVariant?.option1,
              oldVariant?.option2,
              oldVariant?.option3,
            ] as string[];

            for (let i = 0; i < newVariants.length; i++) {
              const newVariant = newVariants[i];
              const newOptions = newVariant.options;
              if (
                newOptions &&
                !newVariant?.id &&
                oldOptions.every((v, i) => v === (newOptions[i] || null))
              ) {
                newVariant.id = shopify.getGraphQLId(
                  oldVariant.id,
                  GraphQLResource.ProductVariant
                );

                // If existing variant has an image, update variant image is blank,
                // use existing image.
                if (!!(oldVariant.image_id && !newVariant.imageSrc)) {
                  newVariant.imageId = shopify.getGraphQLId(
                    oldVariant.image_id,
                    GraphQLResource.ProductImage
                  );

                  if (newProduct?.images?.length) {
                    // Save varitan's image
                    newProduct.images.push({ id: newVariant.imageId });
                  }
                }
                break;
              }
            }
          });
        }
      });
    }
  }

  /**
   * Use worksheet to import products by REST api.
   *
   * Using product create REST api cannot set variant's image.
   * Must upload all image in product, and than update variant's image_id.
   *
   * For example, 10 products and every product have 1 variant, and every
   * variant have 1 image, we need to call 10 times `product create` api,
   * and than call 10 times `product update` api to update the variant image_id.
   * @see https://community.shopify.com/c/shopify-apis-and-sdks/api-create-product-with-variant-and-add-image-to-variant/td-p/466065
   *
   * The standard account REST api rate limit is 2 requests/second, to complete
   * this import request we need least 10 seconds.
   * @see https://shopify.dev/api/usage/rate-limits
   *
   * On the other hand, the GraphQL `productCreate` mutation only need
   * 10 points cost, and standard account rate limit by 50 points/seconds.
   * The point, `productCreate` mutation can set variant's image, so only
   * 10 times call we can do the same tasks who's using REST api.
   *
   * @param worksheet
   * @returns Promise<ImportResponse[]>
   * @deprecated Use `ProductsService.import` instead.
   */
  /* istanbul ignore next */
  importByRest(worksheet: Worksheet): Promise<ImportResponse[]> {
    l.info('Import products from worksheet');

    const productMap = new Map<string, Product>();
    worksheet.eachRow((row, rowNumber) => {
      // Skipping header row.
      if (rowNumber === 1) {
        return;
      }

      const handle = util.getStringCell(row, 'Handle');
      // Skipping if "Handle" column empty.
      if (handle) {
        const image = new Image({ session: shopify.session });
        image.src = util.getStringCell(row, 'Image Src');
        image.position = util.getNumberCell(row, 'Image Position');

        const variant = new Variant({ session: shopify.session });
        variant.sku = util.getStringCell(row, 'Variant SKU');
        variant.grams = util.getNumberCell(row, 'Variant Grams');
        variant.taxable = util.getBooleanCell(row, 'Variant Taxable');
        variant.barcode = util.getStringCell(row, 'Variant Barcode');
        variant.tax_code = util.getStringCell(row, 'Variant Tax Code');
        variant.weight_unit = util.getStringCell(row, 'Variant Weight Unit');

        variant.inventory_management = util.getStringCell(
          row,
          'Variant Inventory Tracker'
        );

        variant.inventory_quantity = util.getNumberCell(
          row,
          'Variant Inventory QTY'
        );

        variant.inventory_policy = util.getStringCell(
          row,
          'Variant Inventory Policy'
        );

        variant.fulfillment_service = util.getStringCell(
          row,
          'Variant Fulfillment Service'
        );

        variant.requires_shipping = util.getBooleanCell(
          row,
          'Vairant Requires Shipping'
        );

        // Get "Variant Price" column's value from worksheet is typeof `number | null`.
        // "Variant.price" is type of `string | null` in Shopify TypeScript types.
        variant.price =
          util.getNumberCell(row, 'Variant Price')?.toString() || null;

        // Same the "Variant.price"
        variant.compare_at_price =
          util.getNumberCell(row, 'Variant Compare At Price')?.toString() ||
          null;

        let product = productMap.get(handle);
        if (!product) {
          product = new Product({ session: shopify.session });
          product.handle = handle;
          product.images = [];
          product.options = [];
          product.variants = [];

          productMap.set(handle, product);
        }

        const options = product.options as IOption[];

        this.parseOptions(row, variant, options, handle);

        product.options = options;
        product.images?.push(image);
        product.variants?.push(variant);

        product.title = product.title || util.getStringCell(row, 'Title');
        product.vendor = product.vendor || util.getStringCell(row, 'Vendor');
        product.tags = product.tags || util.getStringCell(row, 'Tags');

        product.body_html =
          product.body_html || util.getStringCell(row, 'Body (Html)');

        product.product_type =
          product.product_type || util.getStringCell(row, 'Type');
      }
    });

    const products = [...productMap.values()];
    return Promise.all(
      products.map((p) =>
        p.saveAndUpdate().catch((reason) => {
          l.error(reason, 'create product failed', p);
          p.errors = reason;
        })
      )
    ).then(() => {
      return products.map((p) => {
        return {
          id: p.id,
          handle: p.handle as string,
          url: p.id
            ? `https://${shopify.session.shop}/products/${p.handle}`
            : null,
          errors: JSON.stringify(p?.errors) || null,
        };
      });
    });
  }

  /**
   * Parse product and variant's options to compatible REST api request params.
   *
   * @param row Worksheet row
   * @param variant Product variant
   * @param options Product options
   * @param handle  Product handle, use to throw error message
   * @return void
   */
  /* istanbul ignore next */
  private parseOptions(
    row: Row,
    variant: Variant,
    options: IOption[],
    handle: string
  ): void {
    for (let i = 0; i < 3; i++) {
      const name = util.getStringCell(row, `Option${i + 1} Name`);
      const value = util.getStringCell(row, `Option${i + 1} Value`);

      // If there have the `name` column, MUST BE have a `value` column.
      // If there have the `value` column, MAYBE have a `name` column.
      if (value) {
        if (!options[i]) {
          options[i] = { name: '', values: [] };
        }

        if (name) {
          if (options[i].name !== '' && options[i].name !== name) {
            throw {
              status: 400,
              message: `Multiple "Option${i} Name" ("${options[i].name}", "${name}") in "${handle}"`,
            };
          }

          options[i].name = name;
        }

        options[i].values.push(value);
        variant[`option${i + 1}`] = value;
      }
    }
  }
}

export default new ProductsService();
