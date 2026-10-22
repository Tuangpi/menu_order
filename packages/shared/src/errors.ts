/**
 * Shared API error definitions.
 *
 * The API returns errors in a stable envelope so the web client can react
 * to specific failure reasons without parsing free-text messages.
 */

/** Machine-readable error codes shared by the API and the web client. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Shape of an error response body. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level details, present for `VALIDATION_ERROR`. */
    details?: unknown;
  };
}

/** Shape of a successful response body. */
export interface ApiSuccessBody<T> {
  data: T;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
