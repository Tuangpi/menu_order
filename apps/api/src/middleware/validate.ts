import type { NextFunction, Request, Response } from 'express';
import { z, type ZodType } from 'zod';

import type { ApiErrorBody } from '@menu/shared';

import { validate } from '../lib/validation.js';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (schemas.body) {
      const result = validate(schemas.body, req.body);
      if (!result.ok) {
        const body: ApiErrorBody = { error: result.failure };
        res.status(400).json(body);
        return;
      }
      req.body = result.data;
    }
    if (schemas.query) {
      const result = validate(schemas.query, req.query);
      if (!result.ok) {
        const body: ApiErrorBody = { error: result.failure };
        res.status(400).json(body);
        return;
      }
      (req as { query: unknown }).query = result.data;
    }
    if (schemas.params) {
      const result = validate(schemas.params, req.params);
      if (!result.ok) {
        const body: ApiErrorBody = { error: result.failure };
        res.status(400).json(body);
        return;
      }
      (req as { params: unknown }).params = result.data;
    }
    next();
  };
}

export { z };