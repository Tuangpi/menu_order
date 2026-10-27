# Architecture

## Technology Stack
- Frontend: React, Vite, TypeScript
- Routing: React Router
- UI: Tailwind CSS, shadcn/ui
- Server state: TanStack Query
- Backend: Node.js, Express, TypeScript
- Validation: Zod
- Database: PostgreSQL
- ORM: Prisma
- Realtime: Socket.IO when needed
- Testing: Vitest, Supertest, Playwright

## Architecture Style
Use a modular monolith with a separate React frontend and Express API. Manage both in a TypeScript monorepo.

## Structure

```text
apps/
  web/              # React application
  api/              # Express API
    prisma/         # Prisma schema and migrations (DB owned by the API)
      schema.prisma
      migrations/
packages/
  shared/           # Shared types and schemas
docs/
```

Organize backend modules by business domain: auth, restaurants, menu, tables, orders, payments, and reports.

## Core Data Models
- User
- Restaurant
- RestaurantMembership
- MenuCategory
- MenuItem
- RestaurantTable
- Order
- OrderItem
- PaymentEvent

Every tenant-owned record must be scoped to its restaurant.

## Key Rules
- React handles presentation and user interactions.
- Express enforces business rules and authorization.
- PostgreSQL stores persistent data.
- Calculate prices and totals on the server.
- Preserve order-item names and prices as historical snapshots.
- Keep order status separate from payment status.
- Use database transactions for order creation.
- Use migrations for schema changes.
- Never trust client-supplied restaurant IDs, prices, roles, or payment confirmations.

Do not introduce microservices unless a demonstrated need justifies them.
