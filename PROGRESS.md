# Progress

## Current State

- **Current task:** None. T002 complete.
- **Most recently completed:** T002 — React web app scaffold (2026-10-27).
- **Unfinished work:** T003–T022 (all `TODO`).
- **Blockers:** None.
- **Recommended next:** T003 — Express API scaffold (Zod validation middleware, structured error handling, health endpoint, env config).

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

## Open Questions

- Auth mechanism (session cookie vs token) — decide during T006; session cookies are the leading candidate.
- Playwright browser binaries are deferred to T020 to keep early installs light.
- `docs/PROJECT.md` and root `PROJECT.md` share a filename. Optional cleanup is to rename `docs/PROJECT.md` to `docs/PRODUCT_SPEC.md`. Awaiting the user's call; do not rename unilaterally.

## Risks and Notes

- `docs/` is tracked in git as of commit `27cbb8d`. The earlier untracked-spec risk is resolved.
- `docs/ARCHITECTURE.md` names the shared workspace `packages/shared` and (updated) places `prisma/` under `apps/api/`. T001 confirmed the `packages/shared` layout; T004 will create `apps/api/prisma/`. The earlier root-level `prisma/` plan was superseded by the decision to co-locate Prisma with the API.
- MMK prices must be stored as integers (kyat has no practical minor unit) to avoid floating-point rounding in order totals. Decide the storage type in T004.
