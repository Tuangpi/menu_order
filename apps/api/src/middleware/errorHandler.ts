import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import type { ApiErrorBody } from '@menu/shared';

import { AppError } from '../lib/errors.js';

/**
 * Central Express error handler.
 *
 * Maps known error types to the shared error envelope and a sensible HTTP
 * status. Never leaks stack traces or internals to the client; details are
 * logged server-side only.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // Zod validation failures thrown (not caught by middleware) -> 400.
  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten(),
      },
    };
    res.status(400).json(body);
    return;
  }

  // Application errors carry their own status and code.
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code as ApiErrorBody['error']['code'],
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  // Malformed JSON body -> 400.
  if (error instanceof SyntaxError && 'body' in error) {
    const body: ApiErrorBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    };
    res.status(400).json(body);
    return;
  }

  console.error('Unhandled API error:', error);
  const body: ApiErrorBody = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  res.status(500).json(body);
};