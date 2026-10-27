import { AppRouter } from './router.js';

/**
 * Root application component.
 *
 * Delegates to the router so providers configured in `main.tsx` wrap the
 * whole tree. `App.tsx` previously held a placeholder; routing now lives in
 * `router.tsx`.
 */
export function App() {
  return <AppRouter />;
}
