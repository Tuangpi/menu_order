import { z } from 'zod';

/**
 * Shared Zod schemas.
 *
 * The API validates all external input with these schemas so the web client
 * and the server agree on the accepted shape of a request.
 */

/** A price in whole kyat. Kyat has no minor unit, so this is an integer. */
export const priceSchema = z.number().int().nonnegative();

/** An item name as entered by restaurant staff. */
export const itemNameSchema = z.string().trim().min(1).max(120);

/** A menu item payload accepted by the API. */
export const menuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: itemNameSchema,
  nameEn: z.string().trim().min(1).max(120).nullable().default(null),
  description: z.string().trim().max(500).nullable().default(null),
  price: priceSchema,
  imageUrl: z.string().url().nullable().default(null),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
