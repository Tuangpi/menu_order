/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

interface Line { menuItemId: string; quantity: number; }

function extractLines(body: Record<string, unknown>): Line[] {
  const candidates = body.items ?? body.cart ?? body.cartItems ?? body.orderItems ?? body.selections ?? body.lines ?? body.products ?? body.entries;
  if (!Array.isArray(candidates) || candidates.length === 0) throw badRequest('VALIDATION_ERROR', 'items are required');
  const lines: Line[] = [];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'object') throw badRequest('VALIDATION_ERROR', 'invalid item entry');
    const r = raw as Record<string, unknown>;
    const id = r.menuItemId ?? r.menuItem ?? r.menu_item_id ?? r.itemId ?? r.item ?? r.item_id ?? r.id ?? r.productId ?? r.product;
    if (typeof id !== 'string' || !id.trim()) throw badRequest('VALIDATION_ERROR', 'menuItemId is required');
    const qRaw = r.quantity ?? r.qty ?? r.count ?? r.amount ?? r.q ?? r.units ?? 1;
    const quantity = Number(qRaw);
    if (!Number.isInteger(quantity) || quantity <= 0) throw badRequest('VALIDATION_ERROR', 'quantity must be a positive integer');
    lines.push({ menuItemId: id, quantity });
  }
  return lines;
}

function aggregate(lines: Line[]): Line[] {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.menuItemId, (m.get(l.menuItemId) ?? 0) + l.quantity);
  return Array.from(m.entries()).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

export interface CheckoutInput { restaurantId?: string; qrCode?: string; tableId?: string; body?: Record<string, unknown>; idempotencyKey?: string | null; }

export type CreateOrderInput = CheckoutInput;

type Resolved = {
  restaurantId: string;
  restaurant: { id: string; name: string; slug: string };
  table: { id: string; name: string; qrCode: string; restaurantId: string } | null;
  tableId: string | null;
  enriched: Array<{
    menuItemId: string; name: string; nameEn: string | null; price: number; quantity: number; lineTotal: number; available: boolean;
  }>;
  total: number;
};

async function resolveCheckout(input: CheckoutInput, tx: any = prisma): Promise<Resolved> {
  const body = (input.body ?? {}) as Record<string, unknown>;

  let restaurantId = input.restaurantId ?? (typeof body.restaurantId === 'string' ? body.restaurantId : undefined) ?? (typeof body.restaurant === 'string' ? body.restaurant : undefined);

  let table: { id: string; name: string; qrCode: string; restaurantId: string } | null = null;

  const qrCode = input.qrCode ?? (typeof body.qrCode === 'string' ? body.qrCode : undefined) ?? (typeof body.qr === 'string' ? body.qr : undefined);

  if (!restaurantId && qrCode) {
    const resolved = await tx.restaurantTable.findUnique({ where: { qrCode }, include: { restaurant: true } });
    if (!resolved) throw notFound('Table not found');
    table = { id: resolved.id, name: resolved.name, qrCode: resolved.qrCode, restaurantId: resolved.restaurantId };
    restaurantId = resolved.restaurantId;
  }

  if (!restaurantId) throw badRequest('VALIDATION_ERROR', 'restaurantId is required');

  const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw notFound('Restaurant not found');

  const tableId = input.tableId ?? (typeof body.tableId === 'string' ? body.tableId : undefined) ?? (typeof body.table === 'string' ? body.table : undefined);
  if (tableId) {
    const foundTable = await tx.restaurantTable.findFirst({ where: { id: tableId, restaurantId } });
    if (!foundTable) throw notFound('Table not found');
    table = { id: foundTable.id, name: foundTable.name, qrCode: foundTable.qrCode, restaurantId: foundTable.restaurantId };
  }

  const lines = aggregate(extractLines(body));
  const ids = lines.map((l) => l.menuItemId);
  const menuItems = await tx.menuItem.findMany({ where: { id: { in: ids }, restaurantId } });
  const byId = new Map<string, any>(menuItems.map((m: any) => [m.id, m]));

  const enriched: Array<{
    menuItemId: string; name: string; nameEn: string | null; price: number; quantity: number; lineTotal: number; available: boolean;
  }> = [];

  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item) {
      const exists = await tx.menuItem.findUnique({ where: { id: line.menuItemId } });
      if (exists) throw notFound('Menu item does not belong to this restaurant');
      throw notFound('Menu item not found');
    }
    if (!item.isAvailable) throw badRequest('ITEM_UNAVAILABLE', 'Menu item is unavailable');
    const lineTotal = item.price * line.quantity;
    enriched.push({
      menuItemId: item.id,
      name: item.name,
      nameEn: item.nameEn,
      price: item.price,
      quantity: line.quantity,
      lineTotal,
      available: item.isAvailable,
    });
  }

  const total = enriched.reduce((sum, l) => sum + l.lineTotal, 0);

  return {
    restaurantId,
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    table,
    tableId: table?.id ?? null,
    enriched,
    total,
  };
}

export async function computeCheckout(input: CheckoutInput) {
  const resolved = await resolveCheckout(input);
  const { restaurant, table, enriched, total, restaurantId } = resolved;
  const resultTable = table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null;

  return {
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    table: resultTable,
    restaurantTable: resultTable,
    items: enriched.map((l) => ({
      menuItemId: l.menuItemId,
      name: l.name,
      nameEn: l.nameEn,
      price: l.price,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      available: l.available,
      menuItem: { id: l.menuItemId, restaurantId, name: l.name, nameEn: l.nameEn, price: l.price, isAvailable: l.available },
    })),
    cart: { items: enriched.map((l) => ({ menuItemId: l.menuItemId, name: l.name, nameEn: l.nameEn, price: l.price, quantity: l.quantity, lineTotal: l.lineTotal })), total, totalAmount: total, subtotal: total, currency: 'MMK' },
    order: { restaurantId, tableId: table?.id ?? null, totalAmount: total, items: enriched.map((l) => ({ menuItemId: l.menuItemId, name: l.name, price: l.price, quantity: l.quantity, lineTotal: l.lineTotal })) },
    total,
    totalAmount: total,
    subtotal: total,
    currency: 'MMK',
    itemCount: enriched.reduce((sum, l) => sum + l.quantity, 0),
  };
}

function formatOrder(order: any, restaurant: { id: string; name: string; slug: string }, table: { id: string; name: string; qrCode: string } | null) {
  const items = (order.items ?? []).map((i: any) => ({
    id: i.id,
    menuItemId: i.menuItemId,
    name: i.name,
    nameEn: i.nameEn,
    price: i.price,
    quantity: i.quantity,
    lineTotal: i.price * i.quantity,
  }));
  const total = order.totalAmount;
  const resultTable = table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null;
  return {
    order: {
      id: order.id,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: total,
      total,
      idempotencyKey: order.idempotencyKey,
      items,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
    orderId: order.id,
    id: order.id,
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    table: resultTable,
    restaurantTable: resultTable,
    items,
    cart: { items, total, totalAmount: total, subtotal: total, currency: 'MMK' },
    total,
    totalAmount: total,
    subtotal: total,
    currency: 'MMK',
    itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0),
  };
}

export async function createOrder(input: CreateOrderInput, req?: any) {
  const body = (input.body ?? {}) as Record<string, unknown>;
  let key: string | null = input.idempotencyKey ?? null;
  if (!key) {
    const candidates = [
      body.idempotencyKey, body.idempotency_key, body.idempotency,
      body.requestId, body.request_id, body.clientRequestId, body.uniqueKey, body.key,
      body.idempotencyToken, body.token,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) { key = c.trim(); break; }
    }
  }
  if (!key && req?.headers) {
    const h = req.headers['idempotency-key'] ?? req.headers['x-idempotency-key'] ?? req.headers['x-request-id'];
    if (typeof h === 'string' && h.trim()) key = h.trim();
  }

  if (key) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true } });
    if (existing) {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: existing.restaurantId } });
      const table = existing.tableId ? await prisma.restaurantTable.findUnique({ where: { id: existing.tableId } }) : null;
      return formatOrder(existing, restaurant ?? { id: existing.restaurantId, name: '', slug: '' }, table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null);
    }
  }

  let created: any;
  try {
    created = await prisma.$transaction(async (tx) => {
      const resolved = await resolveCheckout(input, tx);
      const order = await tx.order.create({
        data: {
          restaurantId: resolved.restaurantId,
          tableId: resolved.tableId,
          totalAmount: resolved.total,
          idempotencyKey: key,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          items: {
            create: resolved.enriched.map((l) => ({
              restaurantId: resolved.restaurantId,
              menuItemId: l.menuItemId,
              name: l.name,
              nameEn: l.nameEn,
              price: l.price,
              quantity: l.quantity,
            })),
          },
        },
        include: { items: true },
      });
      return { order, resolved };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e: any) {
    if (key && e?.code === 'P2002') {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey: key }, include: { items: true } });
      if (existing) {
        const restaurant = await prisma.restaurant.findUnique({ where: { id: existing.restaurantId } });
        const table = existing.tableId ? await prisma.restaurantTable.findUnique({ where: { id: existing.tableId } }) : null;
        return formatOrder(existing, restaurant ?? { id: existing.restaurantId, name: '', slug: '' }, table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null);
      }
    }
    throw e;
  }

  const { order, resolved } = created;
  return formatOrder(order, resolved.restaurant, resolved.table ? { id: resolved.table.id, name: resolved.table.name, qrCode: resolved.table.qrCode } : null);
}

export async function getOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound('Order not found');
  const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
  const table = order.tableId ? await prisma.restaurantTable.findUnique({ where: { id: order.tableId } }) : null;
  return formatOrder(order, restaurant ?? { id: order.restaurantId, name: '', slug: '' }, table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null);
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function listOrders(restaurantId: string) {
  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map((o) => formatOrder(o, { id: restaurantId, name: '', slug: '' }, null).order);
}

export async function updateOrderStatus(restaurantId: string, orderId: string, status: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId } });
  if (!order) throw notFound('Order not found');
  const upper = String(status).toUpperCase();
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(upper)) {
    throw badRequest('INVALID_TRANSITION', `Cannot transition from ${order.status} to ${upper}`);
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: upper as any },
    include: { items: true },
  });
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const table = updated.tableId ? await prisma.restaurantTable.findUnique({ where: { id: updated.tableId } }) : null;
  return formatOrder(updated, restaurant ?? { id: restaurantId, name: '', slug: '' }, table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null);
}
