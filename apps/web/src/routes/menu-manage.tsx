import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  sortOrder: number;
  isPublished: boolean;
}
interface Item {
  id: string;
  categoryId: string;
  name: string;
  nameEn: string | null;
  price: number;
  isAvailable: boolean;
}

export function MenuManageRoute() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const qc = useQueryClient();
  const [catName, setCatName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { categories: Category[] } }>(
        `/api/restaurants/${restaurantId}/categories`,
      ),
    enabled: Boolean(restaurantId),
  });
  const { data: items } = useQuery({
    queryKey: ['items', restaurantId],
    queryFn: () =>
      apiFetch<{ data: { items: Item[] } }>(`/api/restaurants/${restaurantId}/items`),
    enabled: Boolean(restaurantId),
  });

  const createCategory = useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/restaurants/${restaurantId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name, isPublished: true }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', restaurantId] }),
  });

  const createItem = useMutation({
    mutationFn: () =>
      apiFetch(`/api/restaurants/${restaurantId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          categoryId: itemCategory,
          name: itemName,
          price: Number(itemPrice),
          isAvailable: true,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', restaurantId] });
      setItemName('');
      setItemPrice('');
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: (item: Item) =>
      apiFetch(`/api/restaurants/${restaurantId}/items/${item.id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', restaurantId] }),
  });

  const togglePublish = useMutation({
    mutationFn: (cat: Category) =>
      apiFetch(`/api/restaurants/${restaurantId}/categories/${cat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !cat.isPublished }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', restaurantId] }),
  });

  const categoryList = categories?.data.categories ?? [];
  const itemList = items?.data.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Menu management</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (catName.trim()) createCategory.mutate(catName.trim());
            setCatName('');
          }}
        >
          <input
            className="flex-1 rounded-md border p-2"
            placeholder="New category name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Add
          </button>
        </form>
        <ul className="space-y-2">
          {categoryList.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{c.name}</span>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => togglePublish.mutate(c)}
              >
                {c.isPublished ? 'Published' : 'Draft'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Items</h2>
        <form
          className="grid gap-2 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (itemName.trim() && itemCategory && itemPrice) createItem.mutate();
          }}
        >
          <select
            className="rounded-md border p-2"
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
          >
            <option value="">Category…</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border p-2"
            placeholder="Item name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            className="rounded-md border p-2"
            placeholder="Price (MMK)"
            type="number"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Add item
          </button>
        </form>
        <ul className="space-y-2">
          {itemList.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.price} MMK</p>
              </div>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => toggleAvailability.mutate(item)}
              >
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
