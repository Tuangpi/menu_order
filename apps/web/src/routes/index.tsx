import { CURRENCY_MMK } from '@menu/shared';

import { Button } from '@/components/ui/button';

/**
 * Placeholder home route.
 *
 * Proves the workspace link to `@menu/shared`, Tailwind styling, and the
 * shadcn/ui Button component all render together.
 */
export function IndexRoute() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Menu Order</h1>
      <p className="text-muted-foreground">
        Currency: <span className="font-medium text-foreground">{CURRENCY_MMK}</span>
      </p>
      <div className="flex gap-2">
        <Button>Primary action</Button>
        <Button variant="outline">Secondary</Button>
      </div>
    </section>
  );
}