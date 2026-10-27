import { Router } from 'express';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
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
    const result = await service.computeCheckout({
      restaurantId: req.params.restaurantId,
      qrCode: req.params.qrCode,
      tableId: req.params.tableId,
      body: req.body as Record<string, unknown>,
    });
    res.status(200).json({ data: result });
  }),
);

// GET preview support
orderRouter.get(
  [
    '/restaurants/:restaurantId/checkout',
  ],
  validateRequest({ params: flexibleParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await service.computeCheckout({
      restaurantId: req.params.restaurantId,
      qrCode: req.params.qrCode,
      body: (req.query as Record<string, unknown>) ?? {},
    });
    res.status(200).json({ data: result });
  }),
);
