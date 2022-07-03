import ProductsService from '../../services/products.service';
import { NextFunction, Request, Response } from 'express';
import { unlink } from 'fs';
import l from '../../../common/logger';
import util from '../../../utils/exceljs.util';

export class Controller {
  // Create products from upload csv/xlsx file
  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    // OpenApiValidator ensure `req.file` have a value.
    // Here's defensive programming to make sure even OpenApiValidator doesn't
    // exist still working.
    /* istanbul ignore next */
    if (!req.file) {
      throw { status: 400, message: 'Missing import file.' };
    }

    const path = req.file.path;
    const collectionId = Number(req.query.collection_id) || undefined;
    // OpenApiValidator ensure `req.query.overwrite` have a value.
    // Here's defensive programming to make sure even OpenApiValidator doesn't
    // exist still working.
    /* istanbul ignore next */
    const overwrite =
      req.query.overwrite?.toString().toUpperCase() === 'TRUE' || false;
    const locationId =
      Number(req.query.location_id) ||
      process.env.SHOPIFY_DEFAULT_LOCATION_ID ||
      undefined;

    try {
      const worksheet = await util.createFromFile(
        path,
        true,
        req.file.originalname
      );

      // Delete upload file after loaded
      // No care about file deleted success or not
      /* istanbul ignore next */
      unlink(path, (err) => err && l.error(err));

      const products = await ProductsService.import(
        worksheet,
        locationId,
        collectionId,
        overwrite
      );
      res.ok({ products });
    } catch (err) {
      next(err);
    }
  }
}
export default new Controller();
