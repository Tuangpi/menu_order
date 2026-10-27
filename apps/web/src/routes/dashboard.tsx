import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

export function DashboardRoute() {
  const [name, setName] = useState('');
  const qc = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ data: { user: { email: string; name: string | null } } }>('/api/auth/me'),
  });
  const { data: restaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => apiFetch<{ data: { restaurants: Restaurant[] } }>('/api/restaurants'),
  });

  const createMutation = useMutation({
    mutationFn: (restaurantName: string) =>
      apiFetch('/api/restaurants', {
        method: 'POST',
        body: JSON.stringify({ name: restaurantName }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurants'] }),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {me?.data.user.email ?? '…'}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Restaurants</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createMutation.mutate(name.trim());
            setName('');
          }}
        >
          <input
            className="flex-1 rounded-md border p-2"
            placeholder="New restaurant name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Create
          </button>
        </form>
        <ul className="space-y-2">
          {(restaurants?.data.restaurants ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <Link className="font-medium text-primary" to={`/dashboard/restaurants/${r.id}/menu`}>
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
