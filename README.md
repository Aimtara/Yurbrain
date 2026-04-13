# Yurbrain Monorepo Starter

This package consolidates the current Yurbrain planning work into a fresh monorepo-aligned starter.

Included:
- frozen architecture docs
- product and UX specs
- agent task pack
- React Native / TypeScript UI scaffolds
- design tokens
- preview / mock data harness
- typed client API layer
- founder and strategy deliverables

## Sprint 2 local runbook

- Start API: `pnpm --filter api dev`
- Run Sprint 2 API tests: `pnpm --filter api test`
- Typecheck API: `pnpm --filter api exec tsc --noEmit`

Implemented deterministic loop surfaces:
- Brain item CRUD (`/brain-items`)
- Threads/messages (`/threads`, `/messages`)
- Deterministic stored feed (`/feed`)
- Manual comment/content -> task conversion (`/tasks/manual-convert`)

This repository is still an MVP starter and intentionally uses in-memory API state for Sprint 2 behavior.
