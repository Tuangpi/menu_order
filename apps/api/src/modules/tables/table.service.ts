import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import crypto from 'node:crypto';

function generateToken(): string {
  return crypto.randomUUID();
}

async function uniqueQrCode(desired?: string): Promise<string> {
  let candidate = desired ?? generateToken();
  let suffix = 0;
  while (true) {
    const existing = await prisma.restaurantTable.findUnique({ where: { qrCode: candidate } });
    if (!existing) return candidate;
    if (desired) {
      suffix += 1;
      candidate = `${desired}-${suffix}`;
    } else {
      candidate = generateToken();
    }
  }
}

export async function listTables(restaurantId: string) {
  return prisma.restaurantTable.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getTable(restaurantId: string, tableId: string) {
  const table = await prisma.restaurantTable.findFirst({ where: { id: tableId, restaurantId } });
  if (!table) throw notFound('Table not found');
  return table;
}

export async function createTable(
  restaurantId: string,
  input: { name: string; isActive?: boolean; active?: boolean; qrCode?: string },
) {
  const qrCode = await uniqueQrCode(input.qrCode);
  const isActive = input.isActive ?? input.active ?? true;
  return prisma.restaurantTable.create({
    data: { restaurantId, name: input.name, qrCode, isActive },
  });
}

export async function updateTable(
  restaurantId: string,
  tableId: string,
  input: { name?: string; isActive?: boolean; active?: boolean },
) {
  await getTable(restaurantId, tableId);
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.active !== undefined) data.isActive = input.active;
  return prisma.restaurantTable.update({ where: { id: tableId }, data });
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  await getTable(restaurantId, tableId);
  await prisma.restaurantTable.delete({ where: { id: tableId } });
}

export async function resolveTable(qrCode: string) {
  const table = await prisma.restaurantTable.findUnique({
    where: { qrCode },
    include: { restaurant: true },
  });
  if (!table) throw notFound('Table not found');
  return { table, restaurant: table.restaurant };
}
