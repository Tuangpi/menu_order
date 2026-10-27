import { Router } from 'express';

import { ApiSuccessBody } from '@menu/shared';

import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
  reorderCategoriesSchema,
  createItemSchema,
  updateItemSchema,
  itemParamsSchema,
  listItemsQuerySchema,
  reorderItemsSchema,
  availabilitySchema,
} from './menu.schemas.js';
import * as service from './menu.service.js';

export const menuRouter = Router();

menuRouter.use(requireAuth());

// --- Categories list/create ---
const categoryCollectionPaths = [
  '/:restaurantId/categories',
  '/:restaurantId/category',
  '/:restaurantId/menu/categories',
  '/:restaurantId/menu/category',
];

menuRouter.get(
  categoryCollectionPaths,
  validateRequest({ params: categoryParamsSchema.pick({ restaurantId: true }) }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const categories = await service.listCategories(req.restaurantId!);
    const body: ApiSuccessBody<{ categories: typeof categories; items?: undefined }> = {
      data: { categories },
    };
    res.status(200).json(body);
  }),
);

menuRouter.post(
  categoryCollectionPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: createCategorySchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const category = await service.createCategory(req.restaurantId!, req.body as Record<string, unknown>);
    const body: ApiSuccessBody<{ category: typeof category; menuCategory: typeof category }> = {
      data: { category, menuCategory: category },
    };
    res.status(201).json(body);
  }),
);

// --- Reorder categories (before :categoryId) ---
const categoryReorderPaths = [
  '/:restaurantId/categories/reorder',
  '/:restaurantId/category/reorder',
  '/:restaurantId/menu/categories/reorder',
];

menuRouter.patch(
  categoryReorderPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: reorderCategoriesSchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const ids =
      (body.ids as string[] | undefined) ??
      (body.categoryIds as string[] | undefined) ??
      (body.order as string[] | undefined);
    const items = body.categories as { id: string; sortOrder?: number }[] | undefined;
    if (items && Array.isArray(items)) {
      await service.reorderCategoriesWithSort(req.restaurantId!, items);
    } else if (ids && Array.isArray(ids)) {
      await service.reorderCategories(req.restaurantId!, ids);
    }
    const categories = await service.listCategories(req.restaurantId!);
    res.status(200).json({ data: { categories } });
  }),
);

menuRouter.post(
  categoryReorderPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: reorderCategoriesSchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const ids =
      (body.ids as string[] | undefined) ??
      (body.categoryIds as string[] | undefined) ??
      (body.order as string[] | undefined);
    const items = body.categories as { id: string; sortOrder?: number }[] | undefined;
    if (items && Array.isArray(items)) {
      await service.reorderCategoriesWithSort(req.restaurantId!, items);
    } else if (ids && Array.isArray(ids)) {
      await service.reorderCategories(req.restaurantId!, ids);
    }
    const categories = await service.listCategories(req.restaurantId!);
    res.status(200).json({ data: { categories } });
  }),
);

// --- Single category ---
const categoryItemPaths = [
  '/:restaurantId/categories/:categoryId',
  '/:restaurantId/category/:categoryId',
  '/:restaurantId/menu/categories/:categoryId',
  '/:restaurantId/menu/category/:categoryId',
];

menuRouter.get(
  categoryItemPaths,
  validateRequest({ params: categoryParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const category = await service.getCategory(req.restaurantId!, req.params.categoryId!);
    res.status(200).json({ data: { category, menuCategory: category } });
  }),
);

menuRouter.patch(
  categoryItemPaths,
  validateRequest({ params: categoryParamsSchema, body: updateCategorySchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const category = await service.updateCategory(
      req.restaurantId!,
      req.params.categoryId!,
      req.body as Record<string, unknown>,
    );
    res.status(200).json({ data: { category, menuCategory: category } });
  }),
);

menuRouter.delete(
  categoryItemPaths,
  validateRequest({ params: categoryParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    await service.deleteCategory(req.restaurantId!, req.params.categoryId!);
    res.status(204).send();
  }),
);

// publish toggle convenience
const categoryPublishPaths = [
  '/:restaurantId/categories/:categoryId/publish',
  '/:restaurantId/categories/:categoryId/published',
];
menuRouter.patch(
  categoryPublishPaths,
  validateRequest({ params: categoryParamsSchema, body: availabilitySchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const published =
      body.isPublished !== undefined ? body.isPublished : body.available !== undefined ? body.available : true;
    const category = await service.updateCategory(req.restaurantId!, req.params.categoryId!, {
      isPublished: published,
    });
    res.status(200).json({ data: { category, menuCategory: category } });
  }),
);
menuRouter.post(
  categoryPublishPaths,
  validateRequest({ params: categoryParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const category = await service.getCategory(req.restaurantId!, req.params.categoryId!);
    const updated = await service.updateCategory(req.restaurantId!, req.params.categoryId!, {
      isPublished: !category.isPublished,
    });
    res.status(200).json({ data: { category: updated, menuCategory: updated } });
  }),
);

// --- Items collection ---
const itemCollectionPaths = [
  '/:restaurantId/items',
  '/:restaurantId/item',
  '/:restaurantId/menu/items',
  '/:restaurantId/menu/item',
];

menuRouter.get(
  itemCollectionPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    query: listItemsQuerySchema,
  }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>;
    const categoryId = (query.categoryId ?? query.category) as string | undefined;
    const items = await service.listItems(req.restaurantId!, categoryId);
    // optional availability filter
    const availableFilter = query.available;
    const filtered =
      availableFilter === undefined
        ? items
        : items.filter((item) => item.isAvailable === availableFilter);
    const body = { data: { items: filtered, menuItems: filtered } };
    res.status(200).json(body);
  }),
);

menuRouter.post(
  itemCollectionPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: createItemSchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const item = await service.createItem(req.restaurantId!, req.body as Record<string, unknown>);
    res.status(201).json({ data: { item, menuItem: item } });
  }),
);

// --- Reorder items ---
const itemReorderPaths = [
  '/:restaurantId/items/reorder',
  '/:restaurantId/item/reorder',
  '/:restaurantId/menu/items/reorder',
];

menuRouter.patch(
  itemReorderPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: reorderItemsSchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const ids =
      (body.ids as string[] | undefined) ??
      (body.itemIds as string[] | undefined) ??
      (body.order as string[] | undefined);
    const items = body.items as { id: string; sortOrder?: number }[] | undefined;
    const categoryId = body.categoryId as string | undefined;
    if (items && Array.isArray(items)) {
      await service.reorderItemsWithSort(req.restaurantId!, items);
    } else if (ids && Array.isArray(ids)) {
      await service.reorderItems(req.restaurantId!, ids, categoryId);
    }
    const allItems = await service.listItems(req.restaurantId!, categoryId);
    res.status(200).json({ data: { items: allItems, menuItems: allItems } });
  }),
);

menuRouter.post(
  itemReorderPaths,
  validateRequest({
    params: categoryParamsSchema.pick({ restaurantId: true }),
    body: reorderItemsSchema,
  }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const ids =
      (body.ids as string[] | undefined) ??
      (body.itemIds as string[] | undefined) ??
      (body.order as string[] | undefined);
    const items = body.items as { id: string; sortOrder?: number }[] | undefined;
    const categoryId = body.categoryId as string | undefined;
    if (items && Array.isArray(items)) {
      await service.reorderItemsWithSort(req.restaurantId!, items);
    } else if (ids && Array.isArray(ids)) {
      await service.reorderItems(req.restaurantId!, ids, categoryId);
    }
    const allItems = await service.listItems(req.restaurantId!, categoryId);
    res.status(200).json({ data: { items: allItems, menuItems: allItems } });
  }),
);

// --- Single item ---
const itemItemPaths = [
  '/:restaurantId/items/:itemId',
  '/:restaurantId/item/:itemId',
  '/:restaurantId/menu/items/:itemId',
  '/:restaurantId/menu/item/:itemId',
];

menuRouter.get(
  itemItemPaths,
  validateRequest({ params: itemParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const item = await service.getItem(req.restaurantId!, req.params.itemId!);
    res.status(200).json({ data: { item, menuItem: item } });
  }),
);

menuRouter.patch(
  itemItemPaths,
  validateRequest({ params: itemParamsSchema, body: updateItemSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const item = await service.updateItem(
      req.restaurantId!,
      req.params.itemId!,
      req.body as Record<string, unknown>,
    );
    res.status(200).json({ data: { item, menuItem: item } });
  }),
);

menuRouter.delete(
  itemItemPaths,
  validateRequest({ params: itemParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    await service.deleteItem(req.restaurantId!, req.params.itemId!);
    res.status(204).send();
  }),
);

// --- Availability toggle ---
const availabilityPaths = [
  '/:restaurantId/items/:itemId/availability',
  '/:restaurantId/items/:itemId/available',
];

menuRouter.patch(
  availabilityPaths,
  validateRequest({ params: itemParamsSchema, body: availabilitySchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    let available = body.isAvailable ?? body.available;
    if (available === undefined) {
      const current = await service.getItem(req.restaurantId!, req.params.itemId!);
      available = !current.isAvailable;
    }
    const item = await service.setItemAvailability(
      req.restaurantId!,
      req.params.itemId!,
      Boolean(available),
    );
    res.status(200).json({ data: { item, menuItem: item } });
  }),
);

menuRouter.post(
  availabilityPaths,
  validateRequest({ params: itemParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const current = await service.getItem(req.restaurantId!, req.params.itemId!);
    const item = await service.setItemAvailability(
      req.restaurantId!,
      req.params.itemId!,
      !current.isAvailable,
    );
    res.status(200).json({ data: { item, menuItem: item } });
  }),
);
