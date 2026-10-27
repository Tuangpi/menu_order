/* eslint-disable @typescript-eslint/no-namespace */
import type { NextFunction, Request, Response } from 'express';

import { getSessionUser } from '../modules/auth/auth.service.js';
import { unauthorized } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string | null };
    }
  }
}

export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token =
      (req.signedCookies as Record<string, string> | undefined)?.session ??
      (req.cookies as Record<string, string> | undefined)?.session;
    const user = await getSessionUser(token);
    if (!user) {
      next(unauthorized());
      return;
    }
    req.user = user;
    next();
  };
}
