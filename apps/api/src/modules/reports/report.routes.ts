import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import { flexibleParamsSchema, checkoutBodySchema } from '../orders/order.schemas.js';
import * as service from './report.service.js';

export const reportRouter = Router();

const reportPaths = [
  '/restaurants/:restaurantId/reports',
  '/restaurants/:restaurantId/report',
  '/restaurants/:restaurantId/reports/daily',
  '/restaurants/:restaurantId/reports/sales',
  '/restaurants/:restaurantId/reports/daily-sales',
  '/restaurants/:restaurantId/sales',
  '/restaurants/:restaurantId/sales-report',
  '/restaurants/:restaurantId/daily-sales',
];

reportRouter.get(
  reportPaths,
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const date = (req.query?.date ?? req.query?.day ?? req.query?.on ?? req.query?.for) as string | undefined;
    const report = await service.getDailyReport(req.restaurantId!, date);
    res.status(200).json({ data: report });
  }),
);

const historyPaths = [
  '/restaurants/:restaurantId/orders/history',
  '/restaurants/:restaurantId/order-history',
  '/restaurants/:restaurantId/history',
];

reportRouter.get(
  historyPaths,
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const orders = await service.listOrderHistory(req.restaurantId!);
    res.status(200).json({ data: { orders, orderHistory: orders, history: orders } });
  }),
);

export default reportRouter;
