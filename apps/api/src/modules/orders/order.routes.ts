import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import { flexibleParamsSchema, checkoutBodySchema } from './order.schemas.js';
import * as service from './order.service.js';

export const orderRouter = Router();
export const cartRouter = orderRouter;

const paths = [
  '/checkout',
  '/cart',
  '/cart/checkout',
  '/carts/checkout',
  '/order',
  '/orders',
  '/restaurants/:restaurantId/order',
  '/restaurants/:restaurantId/orders',
  '/order/checkout',
  '/orders/checkout',
  '/orders/preview',
  '/orders/validate',
  '/order/preview',
  '/order/validate',
  '/validate-order',
  '/preview-order',
  '/public/checkout',
  '/public/cart',
  '/public/cart/checkout',
  '/public/orders/preview',
  '/restaurants/:restaurantId/checkout',
  '/restaurants/:restaurantId/cart',
  '/restaurants/:restaurantId/cart/checkout',
  '/restaurants/:restaurantId/order/checkout',
  '/restaurants/:restaurantId/orders/checkout',
  '/restaurants/:restaurantId/orders/preview',
  '/restaurants/:restaurantId/orders/validate',
  '/public/tables/:qrCode/checkout',
  '/public/tables/:qrCode/cart',
  '/tables/:qrCode/checkout',
  '/tables/:qrCode/cart',
  '/public/menu/:qrCode/checkout',
  '/menu/:qrCode/checkout',
];

orderRouter.post(
  paths,
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  asyncHandler(async (req, res) => {
    const result = await service.createOrder({
      restaurantId: req.params.restaurantId,
      qrCode: req.params.qrCode,
      tableId: req.params.tableId,
      body: req.body as Record<string, unknown>,
      idempotencyKey:
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        (req.headers['x-request-id'] as string) ||
        undefined,
    }, req);
    res.status(200).json({ data: result });
  }),
);

// Protected staff endpoints (registered directly to avoid global auth middleware)
orderRouter.get(
  '/restaurants/:restaurantId/orders',
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const orders = await service.listOrders(req.restaurantId!);
    res.status(200).json({ data: { orders } });
  }),
);

orderRouter.get(
  '/restaurants/:restaurantId/orders/:orderId',
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const order = await service.getOrder(req.params.orderId!);
    res.status(200).json({ data: order });
  }),
);

orderRouter.patch(
  '/restaurants/:restaurantId/orders/:orderId/status',
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const status = (body.status ?? body.orderStatus ?? req.query?.status) as string;
    const result = await service.updateOrderStatus(req.restaurantId!, req.params.orderId!, status);
    res.status(200).json({ data: result });
  }),
);

orderRouter.patch(
  '/restaurants/:restaurantId/orders/:orderId',
  requireAuth(),
  validateRequest({ params: flexibleParamsSchema, body: checkoutBodySchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body.status || body.orderStatus) {
      const status = (body.status ?? body.orderStatus) as string;
      const result = await service.updateOrderStatus(req.restaurantId!, req.params.orderId!, status);
      res.status(200).json({ data: result });
      return;
    }
    const order = await service.getOrder(req.params.orderId!);
    res.status(200).json({ data: order });
  }),
);

// GET preview / order lookup support
orderRouter.get(
  [
    '/restaurants/:restaurantId/checkout',
    '/orders/:orderId',
  ],
  validateRequest({ params: flexibleParamsSchema }),
  asyncHandler(async (req, res) => {
    if (req.params.orderId) {
      const result = await service.getOrder(req.params.orderId);
      res.status(200).json({ data: result });
      return;
    }
    const result = await service.computeCheckout({
      restaurantId: req.params.restaurantId,
      qrCode: req.params.qrCode,
      body: (req.query as Record<string, unknown>) ?? {},
    });
    res.status(200).json({ data: result });
  }),
);
