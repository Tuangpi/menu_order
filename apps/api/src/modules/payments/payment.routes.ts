import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import { flexibleParamsSchema, checkoutBodySchema } from '../orders/order.schemas.js';
import * as service from './payment.service.js';

export const paymentRouter = Router();
// Record a payment for an order
paymentRouter.post(
  ['/restaurants/:restaurantId/orders/:orderId/payments', '/restaurants/:restaurantId/orders/:orderId/payment', '/restaurants/:restaurantId/orders/:orderId/pay'],
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  requireAuth(),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const event = await service.recordPayment(
      req.restaurantId!,
      req.params.orderId!,
      req.user!.id,
      (req.body ?? {}) as Record<string, unknown>,
    );
    res.status(201).json({ data: { payment: event, paymentEvent: event } });
  }),
);

// List payments for an order/restaurant
paymentRouter.get(
  ['/restaurants/:restaurantId/orders/:orderId/payments', '/restaurants/:restaurantId/payments'],
  validateRequest({ params: flexibleParamsSchema }),
  requireAuth(),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const events = await service.listPayments(req.restaurantId!, req.params.orderId);
    res.status(200).json({ data: { payments: events, paymentEvents: events } });
  }),
);

// Confirm a recorded (wallet) payment
paymentRouter.patch(
  ['/restaurants/:restaurantId/payments/:paymentId/confirm', '/restaurants/:restaurantId/orders/:orderId/payments/:paymentId/confirm'],
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  requireAuth(),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const event = await service.confirmPayment(
      req.restaurantId!,
      req.params.paymentId!,
      req.user!.id,
    );
    res.status(200).json({ data: { payment: event, paymentEvent: event } });
  }),
);

export default paymentRouter;
