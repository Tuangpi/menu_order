import { z } from 'zod';

const uuid = z.string().uuid();

export const createTableSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean().optional().default(true),
  active: z.boolean().optional(),
  qrCode: z.string().trim().min(1).max(255).optional(),
});

export const updateTableSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.isActive !== undefined || value.active !== undefined,
    { message: 'At least one field must be provided' },
  );

export const tableParamsSchema = z.object({
  restaurantId: uuid,
  tableId: uuid,
});

export const resolveParamsSchema = z.object({
  qrCode: z.string().trim().min(1).max(255),
});
