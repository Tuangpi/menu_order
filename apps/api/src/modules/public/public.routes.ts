import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { resolveParamsSchema } from '../tables/table.schemas.js';
import * as tableService from '../tables/table.service.js';
import { prisma } from '../../lib/prisma.js';

export const publicRouter = Router();

async function buildMenu(restaurantId: string) {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  return categories;
}

const qrPaths = [
  '/public/menu/:qrCode',
  '/menu/:qrCode',
  '/public/tables/:qrCode/menu',
  '/tables/:qrCode/menu',
];

publicRouter.get(
  qrPaths,
  validateRequest({ params: resolveParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await tableService.resolveTable(req.params.qrCode!);
    const categories = await buildMenu(result.restaurant.id);
    res.status(200).json({
      data: {
        restaurant: result.restaurant,
        table: result.table,
        categories,
      },
    });
  }),
);

const restaurantPaths = [
  '/public/restaurants/:restaurantId/menu',
  '/restaurants/:restaurantId/public-menu',
];

publicRouter.get(
  restaurantPaths,
  asyncHandler(async (req, res) => {
    const restaurantId = req.params.restaurantId!;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Restaurant not found' } });
      return;
    }
    const categories = await buildMenu(restaurantId);
    res.status(200).json({ data: { restaurant, categories } });
  }),
);
