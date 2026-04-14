# Yurbrain Current State Checkpoint

_Last updated: April 14, 2026._

This document is the single source of truth for what is currently implemented versus what is still prototype/stub behavior.

## What is implemented today

### Monorepo structure
- `apps/api`, `apps/web`, `apps/mobile`
- `packages/contracts`, `packages/client`, `packages/ui`, `packages/db`, `packages/ai`

### Backend/API (strongest layer)
- Route groups and service modules for brain items, threads, messages, feed, AI, convert, tasks, and sessions.
- Deterministic + AI-assisted flow coverage across Sprint 2–6 test suites.
- Observability middleware and structured error envelopes.

### Contracts and schema foundation
- `packages/contracts` contains real request/response + domain schemas.
- `packages/db` includes schema and additive migrations for planned persistence model.

### Client surfaces
- Web shell integrates shared client/UI packages and demonstrates core loop flows.
- Mobile shell exists and is wired to major flows, but remains less mature than web UX.

## What is stubbed or placeholder behavior

- Several UI interactions are functional but visually and ergonomically placeholder-level.
- AI flows include deterministic fallback paths designed for safety over quality.
- Feed and conversion behavior are present but still tuned as prototype logic, not calibrated product UX.

## What is deterministic prototype behavior (by design)

- API behavior prioritizes deterministic responses in key fallback paths.
- Test coverage focuses heavily on route/service contract correctness and fallback behavior.
- End-to-end flow exists as a technical smoke path, not a polished user journey.

## Not production-ready yet

- Runtime persistence is not integrated: API state is still in-memory, not repository-backed.
- No durable multi-session continuity guarantees in live runtime.
- Client UX (especially mobile-first experience and shared design system strategy) is not yet product-grade.
- Operational hardening (deployment profile, real observability operations, perf budgets, data lifecycle) is incomplete.

## Next milestone: Persistent single-user MVP

A single user can:
- capture thoughts,
- see them resurface,
- comment or ask AI,
- convert to tasks,
- run sessions,
- return later with continuity preserved.

## Items that still need to be addressed

- [ ] Replace in-memory API runtime state with DB-backed repositories.
- [ ] Add local seed/reset scripts for repeatable product iteration.
- [ ] Implement one coherent persistent end-to-end loop (capture → feed → item → comment/AI → convert → session).
- [ ] Define the UI strategy as shared tokens/contracts + platform-specific components.
- [ ] Add a local runbook for install, migrate, seed, and running API/web/mobile together.

## Verification checklist (must pass before claiming production-ready)

- [ ] `pnpm install`
- [ ] `pnpm --filter api test`
- [ ] `pnpm --filter @yurbrain/contracts test`
- [ ] `node --test e2e/full-loop.spec.ts`
- [ ] Manual persistence validation across API restart

## Future work execution instructions

Follow `docs/product/ai-agent-execution-guide.md` for the ordered implementation plan from prototype to persistent MVP.
