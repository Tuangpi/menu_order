import { z } from 'zod';

const ROLES = ['OWNER', 'MANAGER', 'STAFF'] as const;

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional(),
});

export const updateRestaurantSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: 'At least one field must be provided',
  });

export const createMembershipSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(ROLES).default('STAFF'),
});

export const updateMembershipSchema = z.object({
  role: z.enum(ROLES),
});

export const restaurantParamsSchema = z.object({
  restaurantId: z.string().uuid(),
});

export const membershipParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  membershipId: z.string().uuid(),
});
