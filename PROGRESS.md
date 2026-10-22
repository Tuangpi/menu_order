# Progress

## Current State

- **Current task:** None. Task list initialized; T001 is ready to start.
- **Most recently completed:** None. Project initialized 2026-10-22.
- **Unfinished work:** T001–T022 (all `TODO`).
- **Blockers:** None.
- **Recommended next:** T001 — Monorepo scaffolding (npm workspaces + root scripts).

## Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-10-22 | Adopt the Cline managed-project workflow | Six ordered phases, strict dependencies, and a multi-session build make durable task state worthwhile |
| 2026-10-22 | Use npm workspaces without a build orchestrator | Zero extra toolchain; Turborepo deferred until a real need appears |
| 2026-10-22 | Reference the internal shared package with a plain `"*"` range | npm `workspace:` protocol support varies across versions |
| 2026-10-22 | Keep `docs/` as the source of truth for spec and architecture | Root `PROJECT.md` is an index only, so requirements are not duplicated |

## Recent Task Notes

None yet. Append one entry per completed task.

Template:

```text
### T0XX — Task name — DONE
- Result: what was actually built.
- Files changed: paths.
- Decisions: notable choices and why.
- Checks run: commands and real outcomes.
- Follow-up: known issues or deferred work.
```

## Open Questions

- Auth mechanism (session cookie vs token) — decide during T006; session cookies are the leading candidate.
- Shared package build strategy (TypeScript source vs compiled output) — decide during T001 or T002.
- Playwright browser binaries are deferred to T020 to keep early installs light.
- `docs/PROJECT.md` and root `PROJECT.md` share a filename. Optional cleanup is to rename `docs/PROJECT.md` to `docs/PRODUCT_SPEC.md`. Awaiting the user's call; do not rename unilaterally.

## Risks and Notes

- The entire `docs/` directory is currently untracked in git. One `git clean` would destroy the project spec. Recommend committing it; do not commit without explicit user request.
- `docs/ARCHITECTURE.md` names the shared workspace `packages/shared` and places `prisma/` at the repo root. T001 and T004 must follow that layout rather than inventing a different one.
- MMK prices must be stored as integers (kyat has no practical minor unit) to avoid floating-point rounding in order totals. Decide the storage type in T004.
