import type { ApiErrorBody } from '@menu/shared';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import { config } from './config.js';
import { healthRouter } from './routes/health.js';

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

  app.use('/api', healthRouter);

  // 404 handler for unmatched API routes.
  app.use('/api', (_req, res) => {
    const body: ApiErrorBody = {
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
    res.status(404).json(body);
  });

  // Central error handler. Never leak internals to the client.
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error('Unhandled API error:', error);
    const body: ApiErrorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
    res.status(500).json(body);
  };
  app.use(errorHandler);

  return app;
}
