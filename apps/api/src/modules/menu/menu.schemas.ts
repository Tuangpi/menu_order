import { z } from 'zod';

import { itemNameSchema, priceSchema } from '@menu/shared';

const uuid = z.string().uuid();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120).nullable().optional().default(null),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  position: z.number().int().nonnegative().optional(),
  isPublished: z.boolean().optional().default(true),
  published: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    nameEn: z.string().trim().min(1).max(120).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    position: z.number().int().nonnegative().optional(),
    isPublished: z.boolean().optional(),
    published: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.nameEn !== undefined ||
      value.sortOrder !== undefined ||
      value.position !== undefined ||
      value.isPublished !== undefined ||
      value.published !== undefined,
    { message: 'At least one field must be provided' },
  );

export const categoryParamsSchema = z.object({
  restaurantId: uuid,
  categoryId: uuid,
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(uuid).optional(),
  categoryIds: z.array(uuid).optional(),
  order: z.array(uuid).optional(),
  categories: z
    .array(z.object({ id: uuid, sortOrder: z.number().int().nonnegative().optional() }))
    .optional(),
});

export const createItemSchema = z.object({
  categoryId: uuid,
  name: itemNameSchema,
  nameEn: z.string().trim().min(1).max(120).nullable().optional().default(null),
  description: z.string().trim().max(500).nullable().optional().default(null),
  price: priceSchema,
  imageUrl: z.string().url().nullable().optional().default(null),
  isAvailable: z.boolean().optional().default(true),
  available: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  position: z.number().int().nonnegative().optional(),
});

export const updateItemSchema = z
  .object({
    categoryId: uuid.optional(),
    name: itemNameSchema.optional(),
    nameEn: z.string().trim().min(1).max(120).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    price: priceSchema.optional(),
    imageUrl: z.string().url().nullable().optional(),
    isAvailable: z.boolean().optional(),
    available: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.nameEn !== undefined ||
      value.description !== undefined ||
      value.price !== undefined ||
      value.imageUrl !== undefined ||
      value.isAvailable !== undefined ||
      value.available !== undefined ||
      value.sortOrder !== undefined ||
      value.position !== undefined,
    { message: 'At least one field must be provided' },
  );

export const itemParamsSchema = z.object({
  restaurantId: uuid,
  categoryId: uuid.optional(),
  itemId: uuid,
});

export const listItemsQuerySchema = z.object({
  categoryId: uuid.optional(),
  category: uuid.optional(),
  available: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
});

export const reorderItemsSchema = z.object({
  ids: z.array(uuid).optional(),
  itemIds: z.array(uuid).optional(),
  order: z.array(uuid).optional(),
  items: z
    .array(z.object({ id: uuid, sortOrder: z.number().int().nonnegative().optional() }))
    .optional(),
  categoryId: uuid.optional(),
});

export const availabilitySchema = z.object({
  isAvailable: z.boolean().optional(),
  available: z.boolean().optional(),
});
