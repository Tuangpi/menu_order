import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LayoutRoute } from './routes/layout.js';
import { IndexRoute } from './routes/index.js';
import { PublicMenuRoute } from './routes/public-menu.js';
import { LoginRoute } from './routes/login.js';
import { DashboardRoute } from './routes/dashboard.js';
import { MenuManageRoute } from './routes/menu-manage.js';

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
      { path: 'menu/:qrCode', element: <PublicMenuRoute /> },
      { path: 'm/:qrCode', element: <PublicMenuRoute /> },
      { path: 't/:qrCode', element: <PublicMenuRoute /> },
      { path: 'table/:qrCode', element: <PublicMenuRoute /> },
      { path: 'login', element: <LoginRoute /> },
      { path: 'dashboard', element: <DashboardRoute /> },
      { path: 'dashboard/restaurants/:restaurantId/menu', element: <MenuManageRoute /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}