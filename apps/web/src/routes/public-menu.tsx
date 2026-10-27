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

async function fetchMenu(qrCode: string): Promise<PublicMenuResponse> {
  const res = await fetch(`/api/menu/${encodeURIComponent(qrCode)}`);
  if (!res.ok) throw new Error('Failed to load menu');
  return res.json();
}

export function PublicMenuRoute() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [lang, setLang] = useState<'mm' | 'en'>('mm');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', qrCode],
    queryFn: () => fetchMenu(qrCode!),
    enabled: Boolean(qrCode),
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
                    <span className="whitespace-nowrap font-semibold">{formatMMK(item.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
