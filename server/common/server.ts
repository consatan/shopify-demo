import express, { Application } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';
import l from './logger';

import errorHandler from '../api/middlewares/error.handler';
import * as OpenApiValidator from 'express-openapi-validator';

export interface PaginationResponse {
  data: { [key: string]: unknown }[] | { [key: string]: unknown };
  pageInfo: PaginationPageInfo;
}

export interface PaginationPageInfo {
  next: string;
  previous: string;
  limit: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPaginationResponse = (obj: any): obj is PaginationResponse => {
  return (
    typeof obj.data === 'object' &&
    typeof obj.pageInfo === 'object' &&
    typeof obj.pageInfo.limit === 'number' &&
    typeof obj.pageInfo.next === 'string' &&
    typeof obj.pageInfo.previous === 'string'
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
express.response.ok = function (data: any) {
  if (isPaginationResponse(data)) {
    const pageInfo = data.pageInfo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = this.req.query as any;
    const url =
      new URL(
        this.req.baseUrl,
        `${this.req.protocol}://${this.req.hostname}`
      ).toString() + '?';

    query['limit'] = pageInfo.limit;
    if (pageInfo.next) {
      query['cursor'] = pageInfo.next;
      pageInfo.next = url + new URLSearchParams(query).toString();
    }

    if (pageInfo.previous) {
      query['cursor'] = pageInfo.previous;
      pageInfo.previous = url + new URLSearchParams(query).toString();
    }
  }

  return this.json({
    status: 200,
    data: data,
    errors: [],
  });
};

/* istanbul ignore next */
express.response.error = function (
  message: string,
  status = 500,
  errors?: string[]
) {
  throw { message, status, errors };
};

const app = express();

export default class ExpressServer {
  private routes: (app: Application) => void;
  constructor() {
    const root = path.normalize(__dirname + '/../..');
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(
      bodyParser.urlencoded({
        extended: true,
        limit: process.env.REQUEST_LIMIT || '100kb',
      })
    );
    app.use(bodyParser.text({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(cookieParser(process.env.SESSION_SECRET || 'mySecret'));
    app.use(express.static(`${root}/public`));

    const apiSpec = path.join(__dirname, 'api.yml');
    const validateResponses = !!(
      process.env.OPENAPI_ENABLE_RESPONSE_VALIDATION &&
      process.env.OPENAPI_ENABLE_RESPONSE_VALIDATION.toLowerCase() === 'true'
    );
    app.use(process.env.OPENAPI_SPEC || '/spec', express.static(apiSpec));
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateResponses,
        ignorePaths: /.*\/spec(\/|$)/,
        fileUploader: false,
        validateSecurity: {
          handlers: {
            ApiKeyAuth: (req, _scopes, _schema) => {
              // Simple authorize, ** Should not be used in production **
              return (
                !process.env.DEMO_API_KEY ||
                process.env.DEMO_API_KEY === req.get('x-api-key')
              );
            },
          },
        },
      })
    );
  }

  router(routes: (app: Application) => void): ExpressServer {
    routes(app);
    app.use(errorHandler);
    return this;
  }

  listen(port: number): Application {
    const welcome = (p: number) => (): void =>
      l.info(
        `up and running in ${
          process.env.NODE_ENV || 'development'
        } @: ${os.hostname()} on port: ${p}}`
      );

    http.createServer(app).listen(port, welcome(port));

    return app;
  }
}
