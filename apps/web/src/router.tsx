import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LayoutRoute } from './routes/layout.js';
import { IndexRoute } from './routes/index.js';

/**
 * Application router.
 *
 * A single root layout route wraps all pages so shared chrome (header, etc.)
 * can be added later without touching individual routes.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutRoute />,
    children: [
      {
        index: true,
        element: <IndexRoute />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}