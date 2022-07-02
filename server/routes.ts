import { Application } from 'express';
import productsRouter from './api/controllers/products/router';
import locationsRouter from './api/controllers/locations/router';
import collectionsRouter from './api/controllers/collections/router';
export default function routes(app: Application): void {
  app.use('/api/v1/products', productsRouter);
  app.use('/api/v1/locations', locationsRouter);
  app.use('/api/v1/collections', collectionsRouter);
}
