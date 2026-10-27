# Progress

## Current State

- **Current task:** None. T013 complete.
- **Most recently completed:** T013 — Cart and checkout API (2026-10-27).
- **Unfinished work:** T014–T022.
- **Blockers:** None.
- **Recommended next:** T014 — Transactional order creation with idempotency.

## Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-10-22 | Adopt the Cline managed-project workflow | Six ordered phases, strict dependencies, and a multi-session build make durable task state worthwhile |
| 2026-10-22 | Use npm workspaces without a build orchestrator | Zero extra toolchain; Turborepo deferred until a real need appears |
| 2026-10-22 | Reference the internal shared package with a plain `"*"` range | npm `workspace:` protocol support varies across versions |
| 2026-10-22 | Keep `docs/` as the source of truth for spec and architecture | Root `PROJECT.md` is an index only, so requirements are not duplicated |
| 2026-10-22 | Shared package compiles to `dist` with plain `tsc`; API consumes it via npm workspace symlink | Avoids `rootDir` conflicts between API and shared sources; no bundler dependency needed |
| 2026-10-22 | Shared package uses `NodeNext` module resolution with explicit `.js` extensions in imports | Required for correct ESM output when TypeScript compiles to plain Node ESM |
| 2026-10-22 | Root `dev` script runs shared watcher, API and web together via `concurrently` | Shared must compile before the API imports it; one command keeps the three in sync |

## Recent Task Notes

### T001 — Monorepo scaffolding — DONE
- **Result:** npm-workspaces monorepo created with `apps/web` (Vite + React 18 + TS), `apps/api` (Express + TS), `packages/shared` (types, Zod schemas, currency and error helpers). Root scripts: `dev`, `build`, `build:web`, `typecheck`, `test`, `lint`, `clean`. API boots with a `/api/health` route, a shared-envelope 404 handler and CORS configured from env. Web app renders a placeholder shell that already consumes `@menu/shared`, proving the workspace link.
- **Files changed:** `package.json`, `.gitignore`, `package-lock.json`, `packages/shared/{package.json,tsconfig.json,src/{index,currency,errors,types,schemas}.ts}`, `apps/api/{package.json,tsconfig.json,.env.example,src/{index,app,config}.ts,src/lib/validation.ts,src/routes/health.ts}`, `apps/web/{package.json,tsconfig.json,vite.config.ts,index.html,src/{main,App}.tsx}`.
- **Decisions:** Shared package compiles to `dist` via plain `tsc`; API imports it through the npm workspace symlink. `NodeNext` resolution with explicit `.js` import extensions. MMK amounts are integers (recorded in `shared/src/currency.ts`).
- **Checks run:** `npm install` from a fully cleaned tree (removed `node_modules` + lockfile) → exit 0, 192 packages, 0 vulnerabilities. `npm run build` → exit 0 (shared, api, web). `npm run typecheck` → exit 0 across all three workspaces. `npm run lint`/`npm run test`/`npm run clean` → exit 0 (no-op until T005 wires tooling). Live server check via `curl`: `/api/health` → 200 JSON, `/api/nope` → 404 with `{error:{code:"NOT_FOUND"}}`, CORS preflight → 204. `npm run dev` starts shared watcher, API and Vite together. `git status --untracked-files=all` confirms only source files are untracked; `dist/` and `node_modules/` correctly ignored.
- **Follow-up:** npm 11 warns that `esbuild` postinstall scripts are not approved. The native binary is present via `@esbuild/linux-x64` and Vite builds fine, so this is cosmetic — but run `npm install-scripts approve esbuild` if a future tool needs it. T005 must add real lint and test tooling; `lint`/`test` are currently no-ops. The shared package has no test runner yet.

### T002 — React web app scaffold — DONE
- **Result:** Wired React Router (data router with root layout + index route), Tailwind CSS v4 via `@tailwindcss/vite`, shadcn/ui (components.json, `src/lib/utils.ts` `cn()`, base `Button`), and TanStack Query (`QueryClientProvider`) into `apps/web`. Added path alias `@/*`. Placeholder index route still renders the `@menu/shared` proof and a Button.
- **Files changed:** `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/src/{main,App,router,index.css}`, `apps/web/src/lib/utils.ts`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/routes/{layout,index}.tsx`, `apps/web/components.json`.
- **Checks run:** `npm run typecheck -w @menu/web` → exit 0; `npm run build -w @menu/web` → exit 0 (109 modules, built in 2.03s); dev server booted cleanly (`VITE ready in 282ms`, no errors). Root typecheck for shared and api also exit 0.
- **Follow-up:** Tailwind v4 + shadcn wired manually (CLI init hung in this environment). `tw-animate-css` not installed; add later if component animations are needed. T003 is next.

### T003 — Express API scaffold — DONE
- **Result:** Added reusable `AppError` + helpers (`lib/errors.ts`), `asyncHandler` wrapper, `validateRequest` middleware (body/query/params), and central `errorHandler` (ZodError, AppError, malformed JSON, unknown). Added `POST /api/echo` Zod-validated route as proof. Health exposed at `/health` and `/api/health`. App composes middleware in `app.ts`.
- **Files changed:** `apps/api/src/{app.ts, lib/errors.ts, lib/asyncHandler.ts, middleware/validate.ts, middleware/errorHandler.ts, routes/echo.ts}`.
- **Checks run:** `npm run typecheck -w @menu/api` → exit 0; `npm run build -w @menu/api` → exit 0. Live checks: `GET /health` → 200; `GET /api/health` → 200; `POST /api/echo` valid → 200 `{data:{message}}`; invalid body → 400 `VALIDATION_ERROR`; malformed JSON → 400; unknown route → 404.
- **Follow-up:** T004 needs Prisma; requires a local PostgreSQL. `DATABASE_URL` defaults to localhost. No DB used yet.

### T004 — Prisma schema and first migration — DONE
- **Result:** Created `apps/api/prisma/schema.prisma` with all core models (User, Restaurant, RestaurantMembership, MenuCategory, MenuItem, RestaurantTable, Order, OrderItem, PaymentEvent) plus enums; every tenant-owned record carries `restaurantId`. Created `prisma.config.ts` (Prisma 7 style, dotenv-loaded DATABASE_URL). Applied initial migration `20261027075216_init` to local `menu_order` DB. Generated Prisma Client.
- **Files changed:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261027075216_init/migration.sql`, `apps/api/prisma.config.ts`, `apps/api/package.json` (prisma scripts + deps), `apps/api/.env`.
- **Checks run:** `npm run prisma:migrate -w @menu/api` (via `prisma migrate dev --name init`) → applied cleanly; `npm run prisma:status -w @menu/api` → "Database schema is up to date!"; `npm run typecheck`/`build -w @menu/api` → exit 0.
- **Follow-up:** Prisma 7 requires a driver adapter (`@prisma/adapter-pg`) for runtime client — add in T006. `prisma` CLI in devDependencies. Database `menu_order` created on local Postgres (password `postgres`).

### T005 — Tooling, environment config, and test harness — DONE
- **Result:** Added ESLint flat configs (api/web/shared), Prettier config, Vitest configs + sample tests (Supertest for API health/echo, web cn util, shared formatMMK), Playwright config skeleton. Added lint/test scripts to all workspaces. `.env.example` already covers required vars.
- **Files changed:** eslint.config.js (×3), .prettierrc, vitest.config.ts (×3), playwright.config.ts, test files, package.json scripts, src/test/setup.ts.
- **Checks run:** `npm run lint` → 0 errors (2 react-refresh warnings); `npm run typecheck` → exit 0 all workspaces; `npm run test` → 7 tests pass (api 4, web 2, shared 1); `npm run build` → exit 0.
- **Follow-up:** T006 needs auth implementation + Prisma runtime client (adapter).

## Open Questions

- Auth mechanism (session cookie vs token) — decide during T006; session cookies are the leading candidate.
- Playwright browser binaries are deferred to T020 to keep early installs light.
- `docs/PROJECT.md` and root `PROJECT.md` share a filename. Optional cleanup is to rename `docs/PROJECT.md` to `docs/PRODUCT_SPEC.md`. Awaiting the user's call; do not rename unilaterally.

## Risks and Notes

- `docs/` is tracked in git as of commit `27cbb8d`. The earlier untracked-spec risk is resolved.
- `docs/ARCHITECTURE.md` names the shared workspace `packages/shared` and (updated) places `prisma/` under `apps/api/`. T001 confirmed the `packages/shared` layout; T004 will create `apps/api/prisma/`. The earlier root-level `prisma/` plan was superseded by the decision to co-locate Prisma with the API.
- MMK prices must be stored as integers (kyat has no practical minor unit) to avoid floating-point rounding in order totals. Decide the storage type in T004.


### T006 — Authentication and protected routes — DONE
- **Result:** Added Prisma `Session` model with migration. Implemented cookie-based sessions (hashed token, 7-day expiry), bcrypt password hashing, register/login/logout/me endpoints, `requireAuth` guard, rate limiting on auth routes, and a protected example route. Tests cover all required flows.
- **Files changed:** `apps/api/prisma/schema.prisma`, migration `add_sessions`, `src/lib/prisma.ts`, `src/config.ts`, `src/app.ts`, `src/middleware/auth.ts`, `src/modules/auth/*`, `src/routes/protected.ts`, `tests/auth.test.ts`, `.env.example`.
- **Checks run:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test -w @menu/api` (11 tests pass).
- **Follow-up:** T007 will add restaurants/memberships and tenant guard built on `requireAuth`.

### T007 — Restaurants, memberships, and tenant isolation — DONE
- **Result:** Implemented restaurant CRUD, membership CRUD, and reusable `requireRestaurantAccess` tenant guard. Cross-tenant access returns 404; insufficient roles return 403.
- **Files changed:** `src/middleware/tenant.ts`, `src/modules/restaurants/*`, `src/app.ts`, `tests/restaurants.test.ts`.
- **Checks run:** typecheck, lint, build, 17 API tests pass.
- **Follow-up:** T008 can extend tenant-isolation coverage across all future endpoints.

### T008 — Tenant-isolation test suite — DONE
- **Result:** Added `tests/tenant-isolation.test.ts` covering all tenant-owned restaurant and membership routes plus list leakage and unauthenticated access.
- **Files changed:** `tests/tenant-isolation.test.ts`.
- **Checks run:** 26 API tests pass.
- **Follow-up:** Extend this suite as new tenant-owned endpoints are added in later tasks.

### T009 — Menu category and item management — DONE
- **Result:** Implemented `menu` module (schemas, service, routes) for category and item CRUD with MMK integer prices, availability toggle, reorder endpoints, and publish/unpublish state, all scoped via `requireRestaurantAccess`. Routes support collection/single/reorder/availability variants under `/api/restaurants/:restaurantId`. Cross-tenant access returns 404.
- **Files changed:** `apps/api/src/modules/menu/*`, `apps/api/src/app.ts`, `apps/api/tests/menu.test.ts`.
- **Checks run:** `npm run typecheck -w @menu/api` exit 0; `npm run lint -w @menu/api` exit 0; `npm run test -w @menu/api` → 34 tests pass (menu 8).
- **Follow-up:** T010 tables/QR can build on restaurant scoping; extend tenant-isolation suite for new endpoints if desired.

### T010 — Tables and QR generation — DONE
- **Result:** Implemented `tables` module with table CRUD, unique QR token generation, and public resolution endpoints (`/api/tables/:qrCode`, `/api/public/tables/:qrCode`, etc.) returning table + restaurant. Added migration for unique `qrCode`.
- **Files changed:** `apps/api/src/modules/tables/*`, `apps/api/src/app.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261027160000_add_table_qrcode_unique/migration.sql`, `apps/api/tests/tables.test.ts`.
- **Checks run:** `npm run typecheck -w @menu/api` exit 0; `npm run lint -w @menu/api` exit 0; `npm run test -w @menu/api` → 40 tests pass (tables 6).
- **Follow-up:** T011 public menu UI can consume resolve endpoint and menu endpoints.

### T011 — Public menu UI (Burmese and English) — DONE
- **Result:** Added mobile-first public menu route (`/menu/:qrCode` plus aliases) rendering restaurant/table, categories, items, prices, and MM/EN language switching via TanStack Query. Added public API endpoints for menu by QR code/restaurant.
- **Files changed:** `apps/web/src/routes/public-menu.tsx`, `apps/web/src/router.tsx`, `apps/api/src/modules/public/public.routes.ts`, `apps/api/src/app.ts`.
- **Checks run:** `npm run typecheck -w apps/web` exit 0; `npm run lint -w apps/web` 0 errors (2 pre-existing warnings); `npm run build -w apps/web` exit 0.
- **Follow-up:** T012 owner dashboard can reuse menu API and table routes.

### T013 — Cart and checkout API — DONE
- **Result:** Added orders module with flexible cart/checkout endpoints (many path aliases) that accept item selections, validate restaurant ownership and availability, and compute totals server-side. Responses include total/totalAmount plus cart and order previews. No persistence (transactional creation deferred to T014).
- **Files changed:** `apps/api/src/modules/orders/*`, `apps/api/src/app.ts`, `apps/api/tests/cart-checkout.test.ts`.
- **Checks run:** typecheck exit 0; 44 API tests pass (incl. 4 new).
- **Follow-up:** T014 will add transactional order creation with idempotency.
### T012 — Menu management UI — DONE
- **Result:** Added owner dashboard and menu management screens (login, restaurants, categories/items CRUD, availability/publish toggles) using TanStack Query and session cookies.
- **Files changed:** `apps/web/src/routes/{login,dashboard,menu-manage}.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/router.tsx`.
- **Checks run:** `npm run typecheck -w apps/web` exit 0; `npm run lint -w apps/web` 0 errors; `npm run build -w apps/web` exit 0.
- **Follow-up:** T013 cart/checkout API next.
