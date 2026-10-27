/* eslint-disable @typescript-eslint/no-namespace */
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

declare global {
  namespace Express {
    interface Request {
      restaurantId?: string;
      membership?: { id: string; userId: string; restaurantId: string; role: string };
    }
  }
}

const paramsSchema = z.object({
  restaurantId: z.string().uuid(),
});

export interface TenantGuardOptions {
  roles?: string[];
}

export function requireRestaurantAccess(options: TenantGuardOptions = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(forbidden('Authentication required'));
      return;
    }
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      next(badRequest('VALIDATION_ERROR', 'Invalid restaurant id'));
      return;
    }
    const restaurantId = parsed.data.restaurantId;

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      next(notFound('Restaurant not found'));
      return;
    }

    const membership = await prisma.restaurantMembership.findUnique({
      where: { userId_restaurantId: { userId: req.user.id, restaurantId } },
    });

    if (!membership) {
      // Hide existence from non-members.
      next(notFound('Restaurant not found'));
      return;
    }

    if (options.roles && !options.roles.includes(membership.role)) {
      next(forbidden('Insufficient permissions'));
      return;
    }

    req.restaurantId = restaurantId;
    req.membership = {
      id: membership.id,
      userId: membership.userId,
      restaurantId: membership.restaurantId,
      role: membership.role,
    };
    next();
  };
}
