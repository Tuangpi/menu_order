import type { NextFunction, Request, Response } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

/**
 * Wraps an async route handler so rejected promises are forwarded to Express's
 * error-handling middleware instead of crashing the process.
 */
export function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}