import { Router } from 'express';

/**
 * Health route.
 *
 * Used by the deployment platform and by developers to confirm the API is
 * up. Deliberately does not touch the database so it stays fast and
 * dependency-free; a database check is added in T005 alongside migrations.
 */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
});
