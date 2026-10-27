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

export interface CheckoutInput { restaurantId?: string; qrCode?: string; tableId?: string; body?: Record<string, unknown>; }

export async function computeCheckout(input: CheckoutInput) {
  const body = (input.body ?? {}) as Record<string, unknown>;

  let restaurantId = input.restaurantId ?? (typeof body.restaurantId === 'string' ? body.restaurantId : undefined) ?? (typeof body.restaurant === 'string' ? body.restaurant : undefined);

  let table: { id: string; name: string; qrCode: string; restaurantId: string } | null = null;

  const qrCode = input.qrCode ?? (typeof body.qrCode === 'string' ? body.qrCode : undefined) ?? (typeof body.qr === 'string' ? body.qr : undefined);

  if (!restaurantId && qrCode) {
    const resolved = await prisma.restaurantTable.findUnique({ where: { qrCode }, include: { restaurant: true } });
    if (!resolved) throw notFound('Table not found');
    table = { id: resolved.id, name: resolved.name, qrCode: resolved.qrCode, restaurantId: resolved.restaurantId };
    restaurantId = resolved.restaurantId;
  }

  if (!restaurantId) throw badRequest('VALIDATION_ERROR', 'restaurantId is required');

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw notFound('Restaurant not found');

  const tableId = input.tableId ?? (typeof body.tableId === 'string' ? body.tableId : undefined) ?? (typeof body.table === 'string' ? body.table : undefined);
  if (tableId) {
    const foundTable = await prisma.restaurantTable.findFirst({ where: { id: tableId, restaurantId } });
    if (!foundTable) throw notFound('Table not found');
    table = { id: foundTable.id, name: foundTable.name, qrCode: foundTable.qrCode, restaurantId: foundTable.restaurantId };
  }

  const lines = aggregate(extractLines(body));
  const ids = lines.map((l) => l.menuItemId);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids }, restaurantId } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const enriched: Array<{
    menuItemId: string; name: string; nameEn: string | null; price: number; quantity: number; lineTotal: number; available: boolean;
    menuItem: { id: string; restaurantId: string; name: string; nameEn: string | null; price: number; isAvailable: boolean };
  }> = [];

  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item) {
      const exists = await prisma.menuItem.findUnique({ where: { id: line.menuItemId } });
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
      menuItem: { id: item.id, restaurantId: item.restaurantId, name: item.name, nameEn: item.nameEn, price: item.price, isAvailable: item.isAvailable },
    });
  }

  const total = enriched.reduce((sum, l) => sum + l.lineTotal, 0);

  const resultTable = table ? { id: table.id, name: table.name, qrCode: table.qrCode } : null;

  return {
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    table: resultTable,
    restaurantTable: resultTable,
    items: enriched,
    cart: { items: enriched, total, totalAmount: total, subtotal: total, currency: 'MMK' },
    order: { restaurantId, tableId: table?.id ?? null, totalAmount: total, items: enriched.map((l) => ({ menuItemId: l.menuItemId, name: l.name, price: l.price, quantity: l.quantity, lineTotal: l.lineTotal })) },
    total,
    totalAmount: total,
    subtotal: total,
    currency: 'MMK',
    itemCount: enriched.reduce((sum, l) => sum + l.quantity, 0),
  };
}
