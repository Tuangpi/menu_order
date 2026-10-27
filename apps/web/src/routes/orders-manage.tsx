import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
};

export function OrdersManageRoute() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { orders: Order[] } }>(`/api/restaurants/${restaurantId}/orders`),
    enabled: Boolean(restaurantId),
    refetchInterval: 5000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', restaurantId] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', restaurantId] }),
  });

  const orders = data?.data.orders ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const next = NEXT_STATUS[o.status];
            return (
              <li key={o.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.status}</span>
                  <span className="text-sm text-muted-foreground">{o.paymentStatus}</span>
                </div>
                <ul className="text-sm space-y-1">
                  {o.items.map((it) => (
                    <li key={it.id}>
                      {it.name} × {it.quantity} — {it.price * it.quantity} MMK
                    </li>
                  ))}
                </ul>
                <p className="font-semibold">Total: {o.totalAmount} MMK</p>
                <div className="flex gap-2">
                  {next ? (
                    <button
                      type="button"
                      className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                      onClick={() => statusMutation.mutate({ orderId: o.id, status: next })}
                    >
                      Move to {next}
                    </button>
                  ) : null}
                  {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      className="rounded-md border px-3 py-1 text-sm"
                      onClick={() => cancelMutation.mutate(o.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
