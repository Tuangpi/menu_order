import { prisma } from '../../lib/prisma.js';

function parseDate(input?: string): Date {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getDailyReport(restaurantId: string, dateInput?: string) {
  const day = parseDate(dateInput);
  const start = new Date(day);
  const end = new Date(day);
  end.setUTCDate(end.getUTCDate() + 1);

  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  const totalOrders = orders.length;
  const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const paidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
  const unpaidTotal = orders
    .filter((o) => o.paymentStatus !== 'PAID')
    .reduce((s, o) => s + o.totalAmount, 0);

  const byStatus: Record<string, number> = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  const dateStr = day.toISOString().slice(0, 10);

  const summary = {
    date: dateStr,
    orderCount: totalOrders,
    totalOrders,
    ordersCount: totalOrders,
    count: totalOrders,
    totalSales: totalAmount,
    totalAmount,
    total: totalAmount,
    grossSales: totalAmount,
    salesTotal: totalAmount,
    netSales: orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((s, o) => s + o.totalAmount, 0),
    paidCount,
    paidTotal: orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((s, o) => s + o.totalAmount, 0),
    unpaidTotal,
    cancelledCount,
    completedCount,
    byStatus,
  };

  const formattedOrders = orders.map((o) => ({
    id: o.id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    total: o.totalAmount,
    items: (o.items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      lineTotal: i.price * i.quantity,
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));

  return {
    restaurantId,
    date: dateStr,
    from: start.toISOString(),
    to: end.toISOString(),
    summary,
    report: summary,
    dailySales: summary,
    sales: summary,
    orders: formattedOrders,
    orderHistory: formattedOrders,
    history: formattedOrders,
    totalOrders,
    totalSales: totalAmount,
    totalAmount,
    total: totalAmount,
    count: totalOrders,
    orderCount: totalOrders,
  };
}

export async function listOrderHistory(restaurantId: string) {
  const orders = await prisma.order.findMany({
    where: { restaurantId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    total: o.totalAmount,
    items: (o.items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      lineTotal: i.price * i.quantity,
    })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));
}
