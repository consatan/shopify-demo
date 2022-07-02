import ProductsService from '../../services/products.service';
import { NextFunction, Request, Response } from 'express';
import { unlink } from 'fs';
import l from '../../../common/logger';
import util from '../../../utils/exceljs.util';

export class Controller {
  // Create products from upload csv/xlsx file
  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.file) {
      throw { status: 400, message: 'Missing import file.' };
    }

    const path = req.file.path;
    const collectionId = Number(req.query?.collection_id) || undefined;
    const overwrite =
      req.query?.overwrite?.toString().toUpperCase() === 'TRUE' || false;
    const locationId =
      Number(req.query?.location_id) ||
      process.env.SHOPIFY_DEFAULT_LOCATION_ID ||
      undefined;

    try {
      const worksheet = await util.createFromFile(
        path,
        true,
        req.file.originalname
      );

      // Delete upload file after loaded
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
