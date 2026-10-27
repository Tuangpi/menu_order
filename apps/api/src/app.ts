import type { ApiErrorBody } from '@menu/shared';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { restaurantRouter } from './modules/restaurants/restaurant.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { tableRouter, tableResolveRouter } from './modules/tables/table.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { echoRouter } from './routes/echo.js';
import { healthRouter } from './routes/health.js';
import { protectedRouter } from './routes/protected.js';

/**
 * Build the Express application.
 *
 * Kept separate from `index.ts` so tests can mount the app without binding
 * a port.
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.sessionSecret));

  // Health is available at both `/health` and `/api/health` for compatibility.
  app.use(healthRouter);
  app.use('/api', healthRouter);

  app.use('/api', orderRouter);
app.use('/api/auth', authRouter);
  app.use('/api/restaurants', restaurantRouter);
app.use('/api/restaurants', menuRouter);
app.use('/api/restaurants', tableRouter);
app.use('/api', tableResolveRouter);
app.use('/api', publicRouter);
  app.use('/api/protected', protectedRouter);
  app.use('/api', echoRouter);

  // 404 handler for unmatched API routes.
  app.use('/api', (_req: Request, res: Response) => {
    const body: ApiErrorBody = {
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
    res.status(404).json(body);
  });

  // Central error handler. Never leak internals to the client.
  app.use(errorHandler);

  return app;
}

