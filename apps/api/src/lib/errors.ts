/**
 * Application-level error with an HTTP status code and a machine-readable
 * error code. Throw this from services/controllers so the central error
 * handler can map it to the shared error envelope without leaking internals.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: unknown): AppError {
  return new AppError(400, code, message, details);
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(401, 'UNAUTHENTICATED', message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(message = 'Conflict'): AppError {
  return new AppError(409, 'CONFLICT', message);
}