# Project: Menu Order

Status: managed project. Task list in `TASKS.md`. Session state in `PROGRESS.md`.

## Goal
Build an affordable, mobile-first restaurant SaaS for Myanmar teahouses, cafes, and small restaurants. Customers scan a table QR code to browse the menu and place an order. Restaurant owners manage menus, tables, orders, payments, and sales from a web dashboard.

## Reference Documents

| File | Purpose |
| --- | --- |
| `docs/PROJECT.md` | Full product spec: goal, users, MVP features, business model, principles |
| `docs/ARCHITECTURE.md` | Stack, structure, data models, architectural rules |
| `docs/DEVELOPMENT.md` | Coding standards, security, ordering/payment rules, test scope, Cline rules |
| `docs/ROADMAP.md` | Six-phase implementation order and MVP acceptance criteria |

This file is the project-level index. It does not restate the spec; `docs/` remains the source of truth for requirements and architecture.

## Scope

### In scope (MVP)
- Restaurant registration and authentication
- Multi-tenant restaurant management
- Burmese and English digital menus
- Menu categories, items, prices in MMK, availability
- Table management and QR code generation
- Customer cart and order submission
- Staff order dashboard and status updates
- Cash and manually confirmed KBZPay, WavePay, and AYA Pay QR payments
- Order history and daily sales reports

### Out of scope (MVP)
- Automated payment-provider verification, webhooks, or settlement
- Native mobile apps
- Multi-currency pricing
- Delivery or takeaway logistics
- Inventory, payroll, and supplier management
- Analytics beyond daily sales
- Microservices (not justified by demonstrated need)

## Technical Stack
- Monorepo: npm workspaces, `apps/*` and `packages/*`
- Frontend: React, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui, TanStack Query
- Backend: Node.js, Express, TypeScript, Zod
- Database: PostgreSQL with Prisma ORM and migrations
- Realtime: Socket.IO when a demonstrated need appears
- Testing: Vitest, Supertest, Playwright

Architecture style: modular monolith, React frontend plus Express API. Backend modules organized by business domain: auth, restaurants, menu, tables, orders, payments, reports.

## Core Data Models
User, Restaurant, RestaurantMembership, MenuCategory, MenuItem, RestaurantTable, Order, OrderItem, PaymentEvent.

Every tenant-owned record is scoped to its restaurant.

## Key Rules
- Express enforces business rules and authorization; React handles presentation only.
- Calculate prices and totals on the server; never trust client-supplied restaurant IDs, prices, roles, or payment confirmations.
- Preserve order-item names and prices as historical snapshots.
- Keep order status separate from payment status.
- Use database transactions for order creation and idempotency to prevent duplicate submissions.
- Use Prisma migrations for all schema changes.
- Verify restaurant membership on every protected operation; prevent cross-tenant access.
- Validate all external input with Zod; rate-limit public order creation and auth endpoints.
- Never log passwords, tokens, or payment secrets; never commit secrets.
- Treat wallet screenshots and customer references as unverified.
- Never claim automated wallet integration works unless it is implemented and tested.

## Milestones

| Phase | Goal | Tasks |
| --- | --- | --- |
| 1 | Foundation: repo, apps, database, tooling | T001–T005 |
| 2 | Authentication and tenancy | T006–T008 |
| 3 | Menu and tables | T009–T012 |
| 4 | Ordering | T013–T016 |
| 5 | Payments and reports | T017–T019 |
| 6 | Testing, security review, and launch | T020–T022 |

Do not begin a phase until the current phase works and its relevant checks pass.

## Key Decisions

| Decision | Choice | Rationale | Date |
| --- | --- | --- | --- |
| Monorepo tooling | npm workspaces, no build orchestrator | Zero extra toolchain and no Turborepo config to maintain | 2026-10-22 |
| Internal shared package | plain `"*"` version range | npm `workspace:` protocol support is inconsistent across versions | 2026-10-22 |
| Parallel dev servers | single root `concurrently` devDependency | Runs web and api together with one dependency | 2026-10-22 |
| Payment verification | manual staff confirmation only | No approved provider integration exists | 2026-10-22 |
| Auth mechanism | session cookies | Decided in T006; httpOnly signed cookie with server-side hashed session token | 2026-10-27 |
| Prisma location | `apps/api/prisma/` | Only the API uses the DB; co-locates schema/migrations with `DATABASE_URL` in `apps/api/.env` | 2026-10-22 |

## Success Criteria
A restaurant can register, configure its menu, generate table QR codes, receive customer orders, manage fulfillment, and record payments without developer assistance.

The MVP is ready for a pilot when a restaurant can manage its menu, generate QR codes, receive customer orders, update order statuses, record payments, and view basic reports securely.
