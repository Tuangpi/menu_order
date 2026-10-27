import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export interface CategoryInput {
  name: string;
  nameEn?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface ItemInput {
  categoryId: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}

function normalizeCategoryInput(input: Record<string, unknown>): CategoryInput {
  const result: CategoryInput = { name: String(input.name) };
  if (input.nameEn !== undefined) result.nameEn = input.nameEn as string | null;
  if (input.sortOrder !== undefined) result.sortOrder = Number(input.sortOrder);
  if (input.position !== undefined) result.sortOrder = Number(input.position);
  if (input.isPublished !== undefined) result.isPublished = Boolean(input.isPublished);
  if (input.published !== undefined) result.isPublished = Boolean(input.published);
  return result;
}

export async function listCategories(restaurantId: string) {
  return prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getCategory(restaurantId: string, categoryId: string) {
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } });
  if (!category) throw notFound('Category not found');
  return category;
}

export async function createCategory(restaurantId: string, rawInput: Record<string, unknown>) {
  const input = normalizeCategoryInput(rawInput);
  return prisma.menuCategory.create({
    data: {
      restaurantId,
      name: input.name,
      nameEn: input.nameEn ?? null,
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
    },
  });
}

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  rawInput: Record<string, unknown>,
) {
  await getCategory(restaurantId, categoryId);
  // name may be undefined for partial updates; remove if undefined
  const data: Record<string, unknown> = {};
  if (rawInput.name !== undefined) data.name = rawInput.name;
  if (rawInput.nameEn !== undefined) data.nameEn = rawInput.nameEn;
  if (rawInput.sortOrder !== undefined || rawInput.position !== undefined) {
    data.sortOrder =
      rawInput.sortOrder !== undefined ? rawInput.sortOrder : rawInput.position;
  }
  if (rawInput.isPublished !== undefined) data.isPublished = rawInput.isPublished;
  if (rawInput.published !== undefined) data.isPublished = rawInput.published;

  return prisma.menuCategory.update({ where: { id: categoryId }, data });
}

export async function deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
  await getCategory(restaurantId, categoryId);
  await prisma.menuCategory.delete({ where: { id: categoryId } });
}

export async function reorderCategories(restaurantId: string, ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.menuCategory.updateMany({
        where: { id, restaurantId },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function reorderCategoriesWithSort(
  restaurantId: string,
  items: { id: string; sortOrder?: number }[],
): Promise<void> {
  await prisma.$transaction(
    items.map((item, index) =>
      prisma.menuCategory.updateMany({
        where: { id: item.id, restaurantId },
        data: { sortOrder: item.sortOrder ?? index },
      }),
    ),
  );
}

function normalizeItemInput(rawInput: Record<string, unknown>): ItemInput {
  const result: ItemInput = {
    categoryId: String(rawInput.categoryId),
    name: String(rawInput.name),
    price: Number(rawInput.price),
  };
  if (rawInput.nameEn !== undefined) result.nameEn = rawInput.nameEn as string | null;
  if (rawInput.description !== undefined) result.description = rawInput.description as string | null;
  if (rawInput.imageUrl !== undefined) result.imageUrl = rawInput.imageUrl as string | null;
  if (rawInput.isAvailable !== undefined) result.isAvailable = Boolean(rawInput.isAvailable);
  if (rawInput.available !== undefined) result.isAvailable = Boolean(rawInput.available);
  if (rawInput.sortOrder !== undefined) result.sortOrder = Number(rawInput.sortOrder);
  if (rawInput.position !== undefined) result.sortOrder = Number(rawInput.position);
  return result;
}

async function ensureCategoryOwned(restaurantId: string, categoryId: string): Promise<void> {
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } });
  if (!category) throw notFound('Category not found');
}

export async function listItems(restaurantId: string, categoryId?: string) {
  return prisma.menuItem.findMany({
    where: {
      restaurantId,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getItem(restaurantId: string, itemId: string) {
  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
  if (!item) throw notFound('Item not found');
  return item;
}

export async function createItem(restaurantId: string, rawInput: Record<string, unknown>) {
  const input = normalizeItemInput(rawInput);
  await ensureCategoryOwned(restaurantId, input.categoryId);
  return prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      nameEn: input.nameEn ?? null,
      description: input.description ?? null,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      isAvailable: input.isAvailable ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateItem(
  restaurantId: string,
  itemId: string,
  rawInput: Record<string, unknown>,
) {
  await getItem(restaurantId, itemId);
  if (rawInput.categoryId !== undefined) {
    await ensureCategoryOwned(restaurantId, String(rawInput.categoryId));
  }
  const data: Record<string, unknown> = {};
  if (rawInput.categoryId !== undefined) data.categoryId = rawInput.categoryId;
  if (rawInput.name !== undefined) data.name = rawInput.name;
  if (rawInput.nameEn !== undefined) data.nameEn = rawInput.nameEn;
  if (rawInput.description !== undefined) data.description = rawInput.description;
  if (rawInput.price !== undefined) data.price = rawInput.price;
  if (rawInput.imageUrl !== undefined) data.imageUrl = rawInput.imageUrl;
  if (rawInput.isAvailable !== undefined) data.isAvailable = rawInput.isAvailable;
  if (rawInput.available !== undefined) data.isAvailable = rawInput.available;
  if (rawInput.sortOrder !== undefined || rawInput.position !== undefined) {
    data.sortOrder =
      rawInput.sortOrder !== undefined ? rawInput.sortOrder : rawInput.position;
  }
  return prisma.menuItem.update({ where: { id: itemId }, data });
}

export async function deleteItem(restaurantId: string, itemId: string): Promise<void> {
  await getItem(restaurantId, itemId);
  await prisma.menuItem.delete({ where: { id: itemId } });
}

export async function setItemAvailability(
  restaurantId: string,
  itemId: string,
  available: boolean,
): Promise<ReturnType<typeof getItem>> {
  await getItem(restaurantId, itemId);
  return prisma.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: available },
  });
}

export async function reorderItems(
  restaurantId: string,
  ids: string[],
  categoryId?: string,
): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.menuItem.updateMany({
        where: { id, restaurantId, ...(categoryId ? { categoryId } : {}) },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function reorderItemsWithSort(
  restaurantId: string,
  items: { id: string; sortOrder?: number }[],
): Promise<void> {
  await prisma.$transaction(
    items.map((item, index) =>
      prisma.menuItem.updateMany({
        where: { id: item.id, restaurantId },
        data: { sortOrder: item.sortOrder ?? index },
      }),
    ),
  );
}
