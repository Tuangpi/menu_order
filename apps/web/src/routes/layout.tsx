import { Outlet } from 'react-router-dom';

/**
 * Root layout route.
 *
 * Renders shared chrome around child routes via `<Outlet />`. Kept minimal for
 * the scaffold; navigation and auth guards are added in later tasks.
 */
export function LayoutRoute() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-4 py-3">
        <span className="font-semibold">Menu Order</span>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}