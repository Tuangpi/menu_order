# Implementation Roadmap

## Phase 1: Foundation
- Set up the monorepo and development scripts.
- Configure React, Express, TypeScript, PostgreSQL, and Prisma.
- Configure environment variables, migrations, linting, and tests.

## Phase 2: Authentication and Tenancy
- Implement authentication and protected routes.
- Create restaurants, users, and memberships.
- Enforce tenant isolation.

## Phase 3: Menu and Tables
- Implement category and item management.
- Implement prices, availability, and publishing.
- Create tables and unique QR links.
- Build the public menu in Burmese and English.

## Phase 4: Ordering
- Implement the cart and checkout flow.
- Validate orders and calculate totals server-side.
- Create order records transactionally.
- Build the staff dashboard and order status workflow.

## Phase 5: Payments and Reports
- Support cash and manually confirmed mobile-wallet payments.
- Track payment status and confirmation history.
- Build order history and daily sales reports.

## Phase 6: Testing and Launch
- Test the complete customer-to-staff workflow.
- Review security and tenant isolation.
- Configure production hosting, backups, and monitoring.
- Pilot with 2–3 restaurants and improve based on feedback.

## Acceptance Criteria
The MVP is ready for a pilot when a restaurant can manage its menu, generate QR codes, receive customer orders, update order statuses, record payments, and view basic reports securely.

Do not begin the next phase until the current phase works and its relevant checks pass.
