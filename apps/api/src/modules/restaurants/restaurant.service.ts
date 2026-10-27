import { conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'restaurant';
}

async function uniqueSlug(desired: string): Promise<string> {
  let slug = desired;
  let suffix = 0;
  while (true) {
    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (!existing) return slug;
    suffix += 1;
    slug = `${desired}-${suffix}`;
  }
}

export async function createRestaurant(
  userId: string,
  input: { name: string; slug?: string },
): Promise<RestaurantRecord> {
  let slug: string;
  if (input.slug) {
    const existing = await prisma.restaurant.findUnique({ where: { slug: input.slug } });
    if (existing) throw conflict('Restaurant slug is already taken');
    slug = input.slug;
  } else {
    slug = await uniqueSlug(slugify(input.name));
  }

  return prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: { name: input.name, slug },
    });
    await tx.restaurantMembership.create({
      data: { userId, restaurantId: restaurant.id, role: 'OWNER' },
    });
    return restaurant;
  });
}

export async function listRestaurantsForUser(userId: string) {
  const memberships = await prisma.restaurantMembership.findMany({
    where: { userId },
    include: { restaurant: true },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => ({
    ...m.restaurant,
    role: m.role,
    membershipId: m.id,
  }));
}

export async function getRestaurant(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw notFound('Restaurant not found');
  return restaurant;
}

export async function updateRestaurant(
  restaurantId: string,
  input: { name?: string; slug?: string },
) {
  if (input.slug) {
    const existing = await prisma.restaurant.findFirst({
      where: { slug: input.slug, NOT: { id: restaurantId } },
    });
    if (existing) throw conflict('Restaurant slug is already taken');
  }
  return prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
    },
  });
}

export async function deleteRestaurant(restaurantId: string): Promise<void> {
  await prisma.restaurant.delete({ where: { id: restaurantId } });
}

export async function listMemberships(restaurantId: string) {
  return prisma.restaurantMembership.findMany({
    where: { restaurantId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addMembership(
  restaurantId: string,
  input: { email: string; role: string },
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw notFound('User not found');

  const existing = await prisma.restaurantMembership.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
  });
  if (existing) throw conflict('User is already a member of this restaurant');

  return prisma.restaurantMembership.create({
    data: { userId: user.id, restaurantId, role: input.role as 'OWNER' | 'MANAGER' | 'STAFF' },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export async function updateMembership(
  restaurantId: string,
  membershipId: string,
  role: string,
) {
  const membership = await prisma.restaurantMembership.findFirst({
    where: { id: membershipId, restaurantId },
  });
  if (!membership) throw notFound('Membership not found');

  return prisma.restaurantMembership.update({
    where: { id: membershipId },
    data: { role: role as 'OWNER' | 'MANAGER' | 'STAFF' },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export async function removeMembership(
  restaurantId: string,
  membershipId: string,
): Promise<void> {
  const membership = await prisma.restaurantMembership.findFirst({
    where: { id: membershipId, restaurantId },
  });
  if (!membership) throw notFound('Membership not found');

  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.restaurantMembership.count({
      where: { restaurantId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw conflict('Cannot remove the last owner');
    }
  }

  await prisma.restaurantMembership.delete({ where: { id: membershipId } });
}
