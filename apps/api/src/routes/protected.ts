import { Router } from 'express';

import { ApiSuccessBody } from '@menu/shared';

import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const protectedRouter = Router();

protectedRouter.get(
  '/',
  requireAuth(),
  asyncHandler(async (_req, res) => {
    const body: ApiSuccessBody<{ ok: boolean }> = { data: { ok: true } };
    res.status(200).json(body);
  }),
);
