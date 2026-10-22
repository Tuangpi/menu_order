# Development Rules

## Coding Standards
- Use TypeScript throughout frontend and backend.
- Prefer small, focused, reusable modules.
- Separate routes/controllers, services, and data access where appropriate.
- Validate all external inputs using Zod.
- Keep business logic out of React components.
- Use consistent naming, formatting, and error handling.
- Avoid unnecessary dependencies and abstractions.

## Security
- Enforce authentication and authorization on the server.
- Verify restaurant membership on every protected operation.
- Prevent cross-tenant access.
- Use secure session handling and appropriate CSRF protection.
- Rate-limit public order creation and authentication endpoints.
- Never commit secrets or expose server credentials to the frontend.
- Do not log passwords, tokens, or payment secrets.

## Ordering and Payments
- Recalculate order totals on the server.
- Prevent duplicate submissions using idempotency.
- Validate item availability and restaurant ownership.
- Record payment confirmations with staff identity and timestamps.
- Treat wallet screenshots and customer references as unverified.
- Never claim automated wallet integration works unless it is implemented and tested.

## Testing
Test business logic, API validation, authorization, tenant isolation, order calculations, status transitions, and payment confirmation.

## Rules for Cline
1. Inspect the repository before modifying files.
2. Present a short plan before each milestone.
3. Implement incrementally.
4. Run relevant tests, type checks, linting, and builds.
5. Fix failures before proceeding.
6. Never silently ignore failed checks.
7. Update documentation when architecture or behavior changes.
8. Do not implement out-of-scope features without approval.

## Definition of Done
A feature is complete only when its acceptance criteria pass, authorization and validation are enforced, relevant tests pass, and errors are handled appropriately.
