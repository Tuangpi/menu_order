import { Router } from 'express';
import { z } from 'zod';

import { ApiSuccessBody } from '@menu/shared';

import { asyncHandler } from '../lib/asyncHandler.js';
import { validateRequest } from '../middleware/validate.js';

const echoBodySchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export const echoRouter = Router();

echoRouter.post(
  '/echo',
  validateRequest({ body: echoBodySchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as { message: string };
    const response: ApiSuccessBody<{ message: string }> = {
      data: { message: body.message },
    };
    res.status(200).json(response);
  }),
);