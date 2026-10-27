import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

interface Report {
  date: string;
  summary?: {
    totalOrders?: number;
    totalSales?: number;
    totalAmount?: number;
    total?: number;
    paidTotal?: number;
    unpaidTotal?: number;
    cancelledCount?: number;
    completedCount?: number;
  };
  orders?: Order[];
}

export function ReportsManageRoute() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: reportData } = useQuery({
    queryKey: ['report', restaurantId, date],
    queryFn: () =>
      apiFetch<{ data: Report }>(
        `/api/restaurants/${restaurantId}/reports/daily?date=${encodeURIComponent(date)}`,
      ),
    enabled: Boolean(restaurantId),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { orders: Order[] } }>(`/api/restaurants/${restaurantId}/orders`),
    enabled: Boolean(restaurantId),
  });

  const report = reportData?.data;
  const summary = (report?.summary ?? report ?? {}) as any;
  const reportOrders = report?.orders ?? [];
  const allOrders = ordersData?.data.orders ?? [];

  const totalSales =
    summary.totalSales ?? summary.totalAmount ?? summary.total ?? 0;
  const totalOrders = summary.totalOrders ?? summary.orderCount ?? reportOrders.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Daily sales report</h2>
        <label className="space-y-1 block">
          <span className="text-sm font-medium">Date</span>
          <input
            type="date"
            className="rounded-md border p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-xl font-semibold">{totalOrders}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Total sales</p>
            <p className="text-xl font-semibold">{totalSales} MMK</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Paid total</p>
            <p className="text-xl font-semibold">{summary.paidTotal ?? 0} MMK</p>
          </div>
        </div>
        {reportOrders.length > 0 ? (
          <ul className="space-y-2">
            {reportOrders.map((o) => (
              <li key={o.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.id.slice(0, 8)}</span>
                  <span>{o.totalAmount} MMK</span>
                </div>
                <p className="text-muted-foreground">
                  {o.status} · {o.paymentStatus} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No orders for this date.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Order history</h2>
        {allOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {allOrders.map((o) => (
              <li key={o.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.id.slice(0, 8)}</span>
                  <span>{o.totalAmount} MMK</span>
                </div>
                <p className="text-muted-foreground">
                  {o.status} · {o.paymentStatus} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
