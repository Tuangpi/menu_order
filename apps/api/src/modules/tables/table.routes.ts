import { Router } from 'express';


import { asyncHandler } from '../../lib/asyncHandler.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRestaurantAccess } from '../../middleware/tenant.js';
import {
  createTableSchema,
  updateTableSchema,
  tableParamsSchema,
  resolveParamsSchema,
} from './table.schemas.js';
import * as service from './table.service.js';

export const tableRouter = Router();
tableRouter.use(requireAuth());

const collectionPaths = ['/:restaurantId/tables', '/:restaurantId/table'];
const itemPaths = ['/:restaurantId/tables/:tableId', '/:restaurantId/table/:tableId'];

tableRouter.get(
  collectionPaths,
  validateRequest({ params: tableParamsSchema.pick({ restaurantId: true }) }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const tables = await service.listTables(req.restaurantId!);
    res.status(200).json({ data: { tables, restaurantTables: tables } });
  }),
);

tableRouter.post(
  collectionPaths,
  validateRequest({ params: tableParamsSchema.pick({ restaurantId: true }), body: createTableSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const table = await service.createTable(req.restaurantId!, req.body as { name: string; isActive?: boolean; active?: boolean; qrCode?: string });
    res.status(201).json({ data: { table, restaurantTable: table } });
  }),
);

tableRouter.get(
  itemPaths,
  validateRequest({ params: tableParamsSchema }),
  requireRestaurantAccess(),
  asyncHandler(async (req, res) => {
    const table = await service.getTable(req.restaurantId!, req.params.tableId!);
    res.status(200).json({ data: { table, restaurantTable: table } });
  }),
);

tableRouter.patch(
  itemPaths,
  validateRequest({ params: tableParamsSchema, body: updateTableSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    const table = await service.updateTable(
      req.restaurantId!,
      req.params.tableId!,
      req.body as Record<string, unknown>,
    );
    res.status(200).json({ data: { table, restaurantTable: table } });
  }),
);

tableRouter.delete(
  itemPaths,
  validateRequest({ params: tableParamsSchema }),
  requireRestaurantAccess({ roles: ['OWNER', 'MANAGER'] }),
  asyncHandler(async (req, res) => {
    await service.deleteTable(req.restaurantId!, req.params.tableId!);
    res.status(204).send();
  }),
);

export const tableResolveRouter = Router();

const resolvePaths = [
  '/public/tables/:qrCode',
  '/public/table/:qrCode',
  '/tables/resolve/:qrCode',
  '/tables/by-qr/:qrCode',
  '/tables/:qrCode',
  '/qr/:qrCode',
  '/public/qr/:qrCode',
];

tableResolveRouter.get(
  resolvePaths,
  validateRequest({ params: resolveParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await service.resolveTable(req.params.qrCode!);
    res.status(200).json({
      data: {
        table: result.table,
        restaurant: result.restaurant,
        restaurantTable: result.table,
      },
    });
  }),
);
