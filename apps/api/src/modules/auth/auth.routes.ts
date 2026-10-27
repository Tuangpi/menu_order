import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { ApiSuccessBody } from '@menu/shared';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { isProduction } from '../../config.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import {
  register,
  login,
  logout,
  AuthUser,
} from './auth.service.js';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

function setSessionCookie(res: import('express').Response, token: string): void {
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    signed: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: import('express').Response): void {
  res.clearCookie('session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    signed: true,
    path: '/',
  });
}

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post(
  '/register',
  validateRequest({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { email: string; password: string; name?: string };
    const result = await register(body);
    setSessionCookie(res, result.sessionToken);
    const response: ApiSuccessBody<{ user: AuthUser }> = { data: { user: result.user } };
    res.status(201).json(response);
  }),
);

authRouter.post(
  '/login',
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { email: string; password: string };
    const result = await login(body);
    setSessionCookie(res, result.sessionToken);
    const response: ApiSuccessBody<{ user: AuthUser }> = { data: { user: result.user } };
    res.status(200).json(response);
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token =
      (req.signedCookies as Record<string, string> | undefined)?.session ??
      (req.cookies as Record<string, string> | undefined)?.session;
    await logout(token);
    clearSessionCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const response: ApiSuccessBody<{ user: AuthUser }> = { data: { user: req.user as AuthUser } };
    res.status(200).json(response);
  }),
);
