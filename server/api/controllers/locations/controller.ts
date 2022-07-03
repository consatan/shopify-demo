import LocationsService from '../../services/locations.service';
import { Request, Response, NextFunction } from 'express';

export class Controller {
  // Returns a list of inventory locations
  all(req: Request, res: Response, next: NextFunction): void {
    LocationsService.all(
      // OpenApiValidator ensure `req.query.limit` have a default value.
      // Here's defensive programming to make sure even OpenApiValidator doesn't
      // exist still working.
      /* istanbul ignore next */
      Number(req.query.limit) || 50,
      req.query.cursor as string
    ).then((data) => res.ok(data), next);
  }
}
export default new Controller();
