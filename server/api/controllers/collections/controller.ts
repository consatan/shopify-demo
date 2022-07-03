import CollectionsService from '../../services/collections.service';
import { Request, Response, NextFunction } from 'express';

export class Controller {
  // Creates a collection
  create(req: Request, res: Response, next: NextFunction): void {
    CollectionsService.create({
      title: req.body.title,
      productIds: req.body.productIds,
      publicationId: req.body.publicationId,
      published: req.body.published,
      descriptionHtml: req.body.descriptionHtml,
      imageSrc: req.body.imageSrc,
      imageId: req.body.imageId,
    })
      .then((resp) => res.ok(resp))
      .catch(next);
  }

  // Updates a collection
  update(req: Request, res: Response, next: NextFunction): void {
    const id = req.params.id as string | number;

    CollectionsService.update(id, {
      title: req.body.title,
      productIds: req.body.productIds,
      publicationId: req.body.publicationId,
      published: req.body.published,
      descriptionHtml: req.body.descriptionHtml,
      imageSrc: req.body.imageSrc,
      imageId: req.body.imageId,
    }).then((resp) => res.ok(resp), next);
  }
}

export default new Controller();
