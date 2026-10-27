import 'dotenv/config';

/**
 * Runtime configuration.
 *
 * Values are read once at startup and validated so the server fails fast
 * with a clear message rather than misbehaving later.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received: ${raw}`);
  }
  return parsed;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: asInt('PORT', 4000),
  databaseUrl: required('DATABASE_URL', 'postgresql://localhost:5432/menu_order'),
  /** Origins allowed to call the API with credentials. */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Secret used to sign session cookies. */
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-session-secret-change-me',
} as const;

export const isProduction = config.nodeEnv === 'production';
