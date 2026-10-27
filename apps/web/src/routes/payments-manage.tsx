import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
}

interface PaymentEvent {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  reference: string | null;
  confirmedById: string | null;
  createdAt: string;
}

const PROVIDERS = ['KBZPay', 'WavePay', 'AYA Pay'];

export function PaymentsManageRoute() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const qc = useQueryClient();

  const { data: ordersData } = useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { orders: Order[] } }>(`/api/restaurants/${restaurantId}/orders`),
    enabled: Boolean(restaurantId),
    refetchInterval: 5000,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { payments: PaymentEvent[]; paymentEvents: PaymentEvent[] } }>(
        `/api/restaurants/${restaurantId}/payments`,
      ),
    enabled: Boolean(restaurantId),
    refetchInterval: 5000,
  });

  const orders = ordersData?.data.orders ?? [];
  const payments = paymentsData?.data.payments ?? paymentsData?.data.paymentEvents ?? [];

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [method, setMethod] = useState<'CASH' | 'MANUAL_WALLET'>('CASH');
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const recordMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/restaurants/${restaurantId}/orders/${selectedOrderId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          paymentMethod: method,
          provider: method === 'MANUAL_WALLET' ? provider : undefined,
          walletProvider: method === 'MANUAL_WALLET' ? provider : undefined,
          reference: method === 'MANUAL_WALLET' ? reference.trim() || undefined : undefined,
          amount: amount.trim() ? Number(amount) : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', restaurantId] });
      qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
      setReference('');
      setAmount('');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/api/restaurants/${restaurantId}/payments/${paymentId}/confirm`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', restaurantId] });
      qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
    },
  });

  const pending = payments.filter(
    (p) => p.status !== 'CONFIRMED' && p.status !== 'FAILED',
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Record a payment</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Order</span>
            <select
              className="w-full rounded-md border p-2"
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                const o = orders.find((x) => x.id === e.target.value);
                if (o) setAmount(String(o.totalAmount));
              }}
            >
              <option value="">Select an order…</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id.slice(0, 8)} · {o.paymentStatus} · {o.totalAmount} MMK
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Method</span>
            <select
              className="w-full rounded-md border p-2"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'CASH' | 'MANUAL_WALLET')}
            >
              <option value="CASH">Cash</option>
              <option value="MANUAL_WALLET">Manual wallet (KBZPay/WavePay/AYA)</option>
            </select>
          </label>
          {method === 'MANUAL_WALLET' ? (
            <>
              <label className="space-y-1">
                <span className="text-sm font-medium">Provider</span>
                <select
                  className="w-full rounded-md border p-2"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Reference / transaction id</span>
                <input
                  className="w-full rounded-md border p-2"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional customer reference"
                />
              </label>
            </>
          ) : null}
          <label className="space-y-1">
            <span className="text-sm font-medium">Amount (MMK)</span>
            <input
              type="number"
              className="w-full rounded-md border p-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selectedOrder ? String(selectedOrder.totalAmount) : 'Order total'}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!selectedOrderId || recordMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={() => recordMutation.mutate()}
        >
          {recordMutation.isPending ? 'Recording…' : 'Record payment'}
        </button>
        {recordMutation.isError ? (
          <p className="text-sm text-destructive">
            {recordMutation.error instanceof Error ? recordMutation.error.message : 'Failed'}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pending confirmations</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending wallet payments.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {p.method} · {p.amount} MMK · {p.status}
                  </p>
                  <p className="text-muted-foreground">
                    Order {p.orderId.slice(0, 8)}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirmMutation.isPending}
                  className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
                  onClick={() => confirmMutation.mutate(p.id)}
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {p.method} · {p.amount} MMK
                  </span>
                  <span className="text-muted-foreground">{p.status}</span>
                </div>
                <p className="text-muted-foreground">
                  Order {p.orderId.slice(0, 8)}
                  {p.reference ? ` · ${p.reference}` : ''}
                  {' · '}
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
