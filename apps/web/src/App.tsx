import { CURRENCY_MMK } from '@menu/shared';

/**
 * Root application shell.
 *
 * T002 replaces this placeholder with routing, Tailwind and shadcn/ui.
 * It already renders shared-package data so the workspace wiring is proven.
 */
export function App() {
  return (
    <main>
      <h1>Menu Order</h1>
      <p>Currency: {CURRENCY_MMK}</p>
    </main>
  );
}
