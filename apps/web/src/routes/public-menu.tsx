import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { formatMMK } from '@menu/shared';

interface PublicMenuItem {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

interface PublicMenuCategory {
  id: string;
  name: string;
  nameEn: string | null;
  isPublished: boolean;
  items: PublicMenuItem[];
}

interface PublicMenuResponse {
  data: {
    restaurant: { id: string; name: string; slug: string };
    table: { id: string; name: string; qrCode: string };
    categories: PublicMenuCategory[];
  };
}

interface OrderResponse {
  data: {
    order: {
      id: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      items: { name: string; price: number; quantity: number }[];
    };
  };
}

async function fetchMenu(qrCode: string): Promise<PublicMenuResponse> {
  const res = await fetch(`/api/menu/${encodeURIComponent(qrCode)}`);
  if (!res.ok) throw new Error('Failed to load menu');
  return res.json();
}

async function fetchOrder(orderId: string): Promise<OrderResponse> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
  if (!res.ok) throw new Error('Failed to load order');
  return res.json();
}

export function PublicMenuRoute() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [lang, setLang] = useState<'mm' | 'en'>('mm');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', qrCode],
    queryFn: () => fetchMenu(qrCode!),
    enabled: Boolean(qrCode),
  });

  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: orderId ? 5000 : false,
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading menu…</p>;
  }
  if (isError || !data) {
    return <p className="text-destructive">Menu not found.</p>;
  }

  const { restaurant, table, categories } = data.data;

  const nameOf = (mm: string, en: string | null) =>
    lang === 'en' && en ? en : mm;

  const allItems = categories.flatMap((c) => c.items);
  const itemById = new Map(allItems.map((i) => [i.id, i]));

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };
  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id] = (next[id] ?? 0) - 1;
      return next;
    });
  };

  const cartEntries = Object.entries(cart);
  const cartTotal = cartEntries.reduce((sum, [id, qty]) => {
    const item = itemById.get(id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const submitOrder = async () => {
    if (cartEntries.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(table.qrCode)}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartEntries.map(([id, qty]) => ({ menuItemId: id, quantity: qty })),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as OrderResponse & { data: { orderId?: string; id?: string } };
      const id = json.data.order?.id ?? json.data.orderId ?? json.data.id;
      if (!id) throw new Error('No order id returned');
      setOrderId(id);
      setCart({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderId && orderData) {
    const order = orderData.data.order;
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Order placed</h1>
          <p className="text-sm text-muted-foreground">
            {restaurant.name} · Table {table.name}
          </p>
        </header>
        <div className="rounded-lg border p-4 space-y-2">
          <p className="font-medium">Status: {order.status}</p>
          <p className="text-sm text-muted-foreground">Payment: {order.paymentStatus}</p>
          <p className="font-semibold">Total: {formatMMK(order.totalAmount)}</p>
          <ul className="space-y-1 text-sm">
            {order.items.map((it, idx) => (
              <li key={idx}>
                {it.name} × {it.quantity} — {formatMMK(it.price * it.quantity)}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => setOrderId(null)}
        >
          Order again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">Table: {table.name}</p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${lang === 'mm' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setLang('mm')}
          >
            မြန်မာ
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1 text-sm ${lang === 'en' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
      </header>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">No menu items available.</p>
      ) : (
        categories.map((category) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{nameOf(category.name, category.nameEn)}</h2>
            {category.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items.</p>
            ) : (
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{nameOf(item.name, item.nameEn)}</p>
                      {item.description ? (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="whitespace-nowrap font-semibold">{formatMMK(item.price)}</span>
                      {item.isAvailable ? (
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => addToCart(item.id)}
                        >
                          Add
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unavailable</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      {cartEntries.length > 0 ? (
        <div className="sticky bottom-0 rounded-lg border bg-background p-4 space-y-2">
          <h2 className="font-semibold">Cart</h2>
          <ul className="space-y-1 text-sm">
            {cartEntries.map(([id, qty]) => {
              const item = itemById.get(id);
              if (!item) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span>
                    {nameOf(item.name, item.nameEn)} × {qty}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{formatMMK(item.price * qty)}</span>
                    <button
                      type="button"
                      className="rounded border px-1 text-xs"
                      onClick={() => removeFromCart(id)}
                    >
                      −
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="font-semibold">Total: {formatMMK(cartTotal)}</span>
            <button
              type="button"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={submitOrder}
            >
              {submitting ? 'Placing…' : 'Place order'}
            </button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
