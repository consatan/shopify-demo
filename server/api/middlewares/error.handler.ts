import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  message?: string;
  status?: number | null;
  errors?: unknown[] | unknown;
  [key: string]: unknown;
}

export default function errorHandler(
  err: ErrorResponse,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const data = {};
  const status = err?.status || 500;
  let errors = [];

  if (err?.errors) {
    if (Array.isArray(err.errors)) {
      if (err.errors.length) {
        errors = err.errors.map((e) => {
          if (typeof e === 'string') {
            return e;
          } else if (e?.message && typeof e.message === 'string') {
            return e.message;
          } else {
            return JSON.stringify(e);
          }
        });
      }
    } else if (typeof err.errors === 'string') {
      errors = [err.errors];
    } else if (
      typeof err?.message !== 'string' &&
      typeof err.errors === 'object' &&
      Object.keys(err.errors).length
    ) {
      errors = [JSON.stringify(err.errors)];
    }
  }

  if (errors.length === 0) {
    errors =
      typeof err?.message === 'string'
        ? [err.message]
        : ['Unknown server error'];
  }

  res.status(status).json({ status, data, errors });
}
