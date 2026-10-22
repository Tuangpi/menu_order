# MENU ORDER

Myanmar digital menu and order SaaS for teahouses, cafes, and small restaurants.

## Project Management

This project is tracked with the Cline managed-project workflow.

| File | Purpose |
| --- | --- |
| [PROJECT.md](PROJECT.md) | Goal, scope, stack, architecture summary, key decisions |
| [TASKS.md](TASKS.md) | Ordered task list (T001–T022) with status and completion checks |
| [PROGRESS.md](PROGRESS.md) | Current state, decisions, recent task notes, handoff |

## Documentation

| File | Purpose |
| --- | --- |
| [docs/PROJECT.md](docs/PROJECT.md) | Product spec: users, MVP features, business model, principles |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, structure, data models, architectural rules |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Coding standards, security, ordering and payment rules, test scope |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Six-phase implementation order and MVP acceptance criteria |

## Getting Started

Requires Node.js 20+ and npm 10+.

```bash
npm install          # install all workspaces
npm run dev          # shared watcher + API (4000) + web (5173)
npm run build        # build shared, api and web
npm run typecheck    # typecheck all workspaces
```

The API reads `apps/api/.env` (copy from `apps/api/.env.example`). The web dev server proxies `/api` to the Express server, so the browser sees a single origin.

Current status: T001 (monorepo scaffolding) complete. Continue with T002 in [TASKS.md](TASKS.md).

## Repository Layout

```text
apps/
  web/              # React + Vite frontend
  api/              # Express API
packages/
  shared/           # Shared types, Zod schemas, helpers
docs/               # Product spec, architecture, development rules, roadmap
```
