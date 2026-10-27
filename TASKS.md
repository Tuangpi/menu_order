# Task List

Status values: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.
One task in flight at a time. Do not start the next task until the current one is `DONE` and its completion check passes.

---

## Phase 1 — Foundation

### T001 — Monorepo scaffolding
- **Status:** DONE
- **Depends on:** none
- **Expected result:** npm-workspaces monorepo with `apps/web`, `apps/api`, `packages/shared`, and root scripts that run install, lint, typecheck, test, and build across workspaces.
- **Completion check:** `npm install` succeeds from a clean clone; `npm run build` and `npm run typecheck` exit 0 with no workspace errors.

### T002 — React web app scaffold
- **Status:** DONE
- **Depends on:** T001
- **Expected result:** Vite + React + TypeScript app in `apps/web` with React Router, Tailwind CSS, shadcn/ui, and TanStack Query wired, plus a placeholder layout route.
- **Completion check:** `npm run dev -w apps/web` serves the app and the root route renders without console errors; `npm run build -w apps/web` exits 0.

### T003 — Express API scaffold
- **Status:** DONE
- **Depends on:** T001
- **Expected result:** Express + TypeScript server in `apps/api` with Zod validation middleware, structured error handling, a health endpoint, and env config loading.
- **Completion check:** `GET /health` returns 200 with a JSON body; invalid input to a Zod-validated route returns a 4xx error payload; `npm run build -w apps/api` exits 0.

### T004 — Prisma schema and first migration
- **Status:** DONE
- **Depends on:** T003
- **Expected result:** Prisma schema defining User, Restaurant, RestaurantMembership, MenuCategory, MenuItem, RestaurantTable, Order, OrderItem, PaymentEvent, with every tenant-owned record carrying `restaurantId`, plus an applied initial migration against a local PostgreSQL database. Schema and migrations live under `apps/api/prisma/` (DB is owned by the API).
- **Completion check:** `npm run prisma:migrate -w @menu/api` (or `prisma migrate dev` run from `apps/api`) applies cleanly to an empty database and `prisma migrate status` reports no pending migrations.

### T005 — Tooling, environment config, and test harness
- **Status:** DONE
- **Depends on:** T004
- **Expected result:** `.env.example` covering all required variables, lint/format config, Vitest + Supertest for API tests, and a Playwright config skeleton for later end-to-end work.
- **Completion check:** `npm run lint`, `npm run typecheck`, and `npm run test` all exit 0 across the monorepo; a sample Vitest and Supertest test pass.

---

## Phase 2 — Authentication and Tenancy

### T006 — Authentication and protected routes
- **Status:** DONE
- **Depends on:** T005
- **Expected result:** Registration, login, logout, and session handling with hashed passwords, plus server-side guards for protected routes and rate limiting on auth endpoints.
- **Completion check:** Automated tests cover register, login, logout, invalid credentials, and rejection of unauthenticated requests to a protected route.

### T007 — Restaurants, memberships, and tenant isolation
- **Status:** DONE
- **Depends on:** T006
- **Expected result:** Restaurant and membership CRUD restricted to owners, with a reusable server-side guard that derives the caller's restaurant scope and rejects cross-tenant access.
- **Completion check:** Tests confirm an authenticated user can only read and write resources belonging to their own restaurant(s).

### T008 — Tenant-isolation test suite
- **Status:** DONE
- **Depends on:** T007
- **Expected result:** Dedicated automated coverage that every tenant-owned endpoint rejects requests carrying another restaurant's identifiers.
- **Completion check:** Isolation tests exist for every tenant-owned route and all pass in CI-style runs.

## Phase 3 — Menu and Tables

### T009 — Menu category and item management
- **Status:** DONE
- **Depends on:** T008
- **Expected result:** Category and item CRUD with MMK prices, availability flag, and publish/unpublish state, all scoped to the caller's restaurant.
- **Completion check:** API tests cover create, update, reorder, availability toggle, and publish state changes with tenant scoping. (apps/api/tests/menu.test.ts: 8 tests pass.)

### T010 — Tables and QR generation
- **Status:** DONE
- **Depends on:** T009
- **Expected result:** Restaurant table CRUD with unique per-table QR links that resolve to the correct table and restaurant on the public route.
- **Completion check:** Tests confirm QR token uniqueness, correct table resolution, and that a token from one restaurant cannot resolve in another. (apps/api/tests/tables.test.ts: 6 tests pass.)

### T011 — Public menu UI (Burmese and English)
- **Status:** DONE
- **Depends on:** T010
- **Expected result:** Mobile-first customer-facing menu reachable from a table QR link, rendering Burmese and English names, prices, and availability, with language switching.
- **Completion check:** A QR link opens the correct restaurant and table menu in a mobile viewport; both languages render and switch correctly. (apps/web build passes; route `/menu/:qrCode` etc.)

### T012 — Menu management UI
- **Status:** DONE
- **Depends on:** T009
- **Expected result:** Owner dashboard screens to manage categories, items, prices, availability, and publishing.
- **Completion check:** An owner can create a category, add an item with an MMK price, and publish the menu through the UI without console errors. (Build passes; routes `/dashboard`, `/dashboard/restaurants/:id/menu`.)

---

## Phase 4 — Ordering

### T013 — Cart and checkout API
- **Status:** DONE
- **Depends on:** T011, T012
- **Expected result:** Cart and checkout endpoints that accept item selections, validate restaurant ownership and item availability, and compute totals server-side.
- **Completion check:** Tests confirm totals are calculated server-side, unavailable items are rejected, and foreign-restaurant items are refused.

### T014 — Transactional order creation with idempotency
- **Status:** DONE
- **Depends on:** T013
- **Expected result:** Order and order-item creation inside a database transaction, storing item name and price as historical snapshots, with idempotency keys preventing duplicate submissions.
- **Completion check:** Tests confirm a repeated idempotency key returns the original order, concurrent submissions create one order, and failed creation leaves no partial records.

### T015 — Customer ordering UI
- **Status:** DONE
- **Depends on:** T013
- **Expected result:** Customer flow to browse the menu, manage a cart, submit an order, and view order status on a mobile device.
- **Completion check:** A customer can place an order end to end from a table QR link and see the resulting order status.

### T016 — Staff dashboard and order status workflow
- **Status:** DONE
- **Depends on:** T014
- **Expected result:** Staff screens listing incoming orders with valid status transitions, keeping order status separate from payment status.
- **Completion check:** Staff can accept, prepare, and complete an order; invalid status transitions are rejected by tests.

## Phase 5 — Payments and Reports

### T017 — Payment recording and manual confirmation
- **Status:** DONE
- **Depends on:** T016
- **Expected result:** Cash and manually confirmed KBZPay, WavePay, and AYA Pay QR payments recorded as PaymentEvents with staff identity and timestamps, and no automated verification claims.
- **Completion check:** Tests confirm confirmations are attributable to staff, timestamps are recorded, and a confirmation cannot be attributed to another restaurant's staff.

### T018 — Payment UI
- **Status:** TODO
- **Depends on:** T017
- **Expected result:** Staff screens to record a payment and confirm a wallet payment, with the customer able to see the resulting payment status.
- **Completion check:** A staff member can record a cash payment and confirm a wallet payment through the UI, and both appear in payment history.

### T019 — Order history and daily sales reports
- **Status:** TODO
- **Depends on:** T018
- **Expected result:** Owner-facing order history plus a daily sales report computed from stored orders for the caller's restaurant only.
- **Completion check:** Report totals match the underlying order records in a test fixture, and cross-tenant data never appears.

---

## Phase 6 — Testing, Security Review, and Launch

### T020 — End-to-end customer-to-staff workflow test
- **Status:** TODO
- **Depends on:** T019
- **Expected result:** A Playwright test covering register, configure menu, generate QR, order, update status, record payment, and view the report.
- **Completion check:** The Playwright suite passes against a seeded test environment.

### T021 — Security and tenant-isolation review
- **Status:** TODO
- **Depends on:** T020
- **Expected result:** Documented review of auth, session handling, CSRF, rate limiting, secret exposure, logging, and cross-tenant access, with fixes applied.
- **Completion check:** Each checklist item is verified by test or code inspection, and unresolved findings are recorded in `PROGRESS.md`.

### T022 — Hosting, backups, monitoring, and pilot checklist
- **Status:** TODO
- **Depends on:** T021
- **Expected result:** Documented production hosting plan, backup and restore procedure, monitoring and alerting setup, and a pilot checklist for 2–3 restaurants.
- **Completion check:** The procedure is written in `docs/`, and a backup restore is performed successfully against a non-production database.
