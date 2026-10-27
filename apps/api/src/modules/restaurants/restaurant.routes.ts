import { Router } from 'express';


import { ApiSuccessBody } from '@menu/shared';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  createMembershipSchema,
  updateMembershipSchema,
  restaurantParamsSchema,
  membershipParamsSchema,
} from './restaurant.schemas.js';
import * as service from './restaurant.service.js';

export const restaurantRouter = Router();

restaurantRouter.use(requireAuth());

restaurantRouter.get('/', asyncHandler(async (req, res) => {
  const restaurants = await service.listRestaurantsForUser(req.user!.id);
  const body: ApiSuccessBody<{ restaurants: typeof restaurants }> = { data: { restaurants } };
  res.status(200).json(body);
}));

restaurantRouter.post(
  '/',
  validateRequest({ body: createRestaurantSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as { name: string; slug?: string };
    const restaurant = await service.createRestaurant(req.user!.id, input);
    const body: ApiSuccessBody<{ restaurant: typeof restaurant }> = { data: { restaurant } };
    res.status(201).json(body);
  }),
);

restaurantRouter.get(
  '/:restaurantId',
  validateRequest({ params: restaurantParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const restaurant = await service.getRestaurant(req.restaurantId!);
    const body: ApiSuccessBody<{ restaurant: typeof restaurant; role: string }> = {
      data: { restaurant, role: req.membership!.role },
    };
    res.status(200).json(body);
  }),
);

restaurantRouter.patch(
  '/:restaurantId',
  validateRequest({ params: restaurantParamsSchema, body: updateRestaurantSchema }),
  requireRestaurantAccess({ roles: ['OWNER'] }),
  asyncHandler(async (req, res) => {
    const input = req.body as { name?: string; slug?: string };
    const restaurant = await service.updateRestaurant(req.restaurantId!, input);
    const body: ApiSuccessBody<{ restaurant: typeof restaurant }> = { data: { restaurant } };
    res.status(200).json(body);
  }),
);

restaurantRouter.delete(
  '/:restaurantId',
  validateRequest({ params: restaurantParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER'] }),
  asyncHandler(async (req, res) => {
    await service.deleteRestaurant(req.restaurantId!);
    res.status(204).send();
  }),
);

// Memberships
restaurantRouter.get(
  '/:restaurantId/memberships',
  validateRequest({ params: restaurantParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const memberships = await service.listMemberships(req.restaurantId!);
    const body: ApiSuccessBody<{ memberships: typeof memberships }> = { data: { memberships } };
    res.status(200).json(body);
  }),
);

restaurantRouter.post(
  '/:restaurantId/memberships',
  validateRequest({ params: restaurantParamsSchema, body: createMembershipSchema }),
  requireRestaurantAccess({ roles: ['OWNER'] }),
  asyncHandler(async (req, res) => {
    const input = req.body as { email: string; role: string };
    const membership = await service.addMembership(req.restaurantId!, input);
    const body: ApiSuccessBody<{ membership: typeof membership }> = { data: { membership } };
    res.status(201).json(body);
  }),
);

restaurantRouter.patch(
  '/:restaurantId/memberships/:membershipId',
  validateRequest({ params: membershipParamsSchema, body: updateMembershipSchema }),
  requireRestaurantAccess({ roles: ['OWNER'] }),
  asyncHandler(async (req, res) => {
    const input = req.body as { role: string };
    const membership = await service.updateMembership(
      req.restaurantId!,
      req.params.membershipId!,
      input.role,
    );
    const body: ApiSuccessBody<{ membership: typeof membership }> = { data: { membership } };
    res.status(200).json(body);
  }),
);

restaurantRouter.delete(
  '/:restaurantId/memberships/:membershipId',
  validateRequest({ params: membershipParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER'] }),
  asyncHandler(async (req, res) => {
    await service.removeMembership(req.restaurantId!, req.params.membershipId!);
    res.status(204).send();
  }),
);
