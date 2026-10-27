# Hosting Plan (MVP)

## Components
- React frontend built with Vite (`apps/web/dist`).
- Express API (`apps/api`) running on Node.js.
- PostgreSQL database.
- Reverse proxy (nginx) terminating TLS and routing `/api` to the API and static assets to the frontend.

## Build
```bash
npm ci
npm run build
npm run prisma:migrate -w @menu/api
```

## Runtime
- Run the API with a process manager (systemd or PM2).
- Serve `apps/web/dist` as static files from nginx.
- Set environment variables in the API host: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `CORS_ORIGINS`, `SESSION_SECRET`.
- `SESSION_SECRET` must be a long random value in production.

## Database migrations
- Apply migrations with `npm run prisma:migrate -w @menu/api` before starting a new API version.
- Never edit applied migrations; add new ones.

## Rollback
- Keep the previous API build and database backup.
- Restore the database backup if a migration must be reverted, then redeploy the previous build.
