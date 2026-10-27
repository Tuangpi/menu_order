# Security and Tenant-Isolation Review (T021)

## Scope
Review of authentication, session handling, CSRF, rate limiting, secret exposure, logging, and cross-tenant access for the Menu Order MVP.

## Checklist

### Authentication
- Passwords hashed with bcrypt (cost 12). Verified by code inspection (`auth.service.ts`).
- Login/register return generic invalid-credential errors. Verified by tests (`auth.test.ts`).
- Protected routes require a valid session. Verified by tests (`auth.test.ts`, `tenant-isolation.test.ts`).

### Session handling
- Session token is 32 random bytes, stored only as SHA-256 hash. Verified by code inspection.
- Cookie is httpOnly, signed, `sameSite: lax`, `secure` in production. Verified by code inspection (`auth.routes.ts`).
- Sessions expire after 7 days and expired sessions are removed. Verified by code inspection.
- Logout deletes the server-side session. Verified by tests.

### CSRF
- State-changing browser requests rely on SameSite=Lax cookies plus a restricted CORS origin list. No CSRF token is issued; acceptable for the MVP because cross-site subrequests do not carry Lax cookies. Documented limitation.

### Rate limiting
- Auth endpoints limited to 100 requests per 15 minutes per IP. Verified by code inspection.
- Public order creation now limited to 60 requests per 15 minutes per IP (added in T021). Verified by code inspection.
- Other endpoints are not rate-limited; low risk behind auth and tenant guards.

### Secret exposure
- Secrets are loaded from environment variables; `.env` is gitignored. Verified by repository inspection.
- `SESSION_SECRET` is required in production; development uses a clearly-named placeholder. Fixed in T021.
- No secrets are logged or returned to clients. Verified by code inspection.

### Logging
- Unhandled errors are logged server-side without stack traces in responses. Verified by code inspection (`errorHandler.ts`).
- No passwords, tokens, or payment references are logged. Verified by code inspection.

### Cross-tenant access
- Every protected tenant route resolves `restaurantId` from the path and verifies membership before access. Verified by tests (`tenant-isolation.test.ts`).
- Order, payment, menu, table, and report services scope queries by `restaurantId`. Verified by code inspection and tests.
- Non-members receive `404` to avoid leaking restaurant existence. Verified by code inspection.

## Fixes applied in T021
- Required `SESSION_SECRET` in production.
- Added rate limiting to public order creation endpoints.

## Unresolved findings
- No CSRF token beyond SameSite=Lax; acceptable for MVP but should be revisited if cross-site cookie usage changes.
- Public order lookup by order ID is unauthenticated by design; order IDs are unguessable UUIDs.
