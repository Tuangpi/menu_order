import type { ApiErrorBody } from '@menu/shared';
import { z } from 'zod';

/**
 * Shared request validation helpers.
 *
 * Centralising this keeps the error envelope consistent across every route.
 */

export type ValidationFailure = ApiErrorBody['error'];

/**
 * Validate `data` against `schema`, returning either the parsed value or a
 * validation failure that can be turned into an HTTP 400 response.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; failure: ValidationFailure } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    failure: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: result.error.flatten(),
    },
  };
}
