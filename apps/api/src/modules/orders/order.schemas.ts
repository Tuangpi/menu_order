import { z } from 'zod';

const uuid = z.string().uuid();

export const checkoutBodySchema = z.object({}).passthrough();

export const flexibleParamsSchema = z
  .object({
    restaurantId: uuid.optional(),
    qrCode: z.string().trim().min(1).max(255).optional(),
    tableId: uuid.optional(),
  })
  .passthrough();
