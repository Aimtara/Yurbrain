# Yurbrain Monorepo Starter

This monorepo contains the implemented MVP through **Sprint 5**.

Included:
- frozen architecture docs
- product and UX specs
- agent task pack
- React Native / TypeScript app scaffold (`apps/mobile`)
- Next.js web app scaffold (`apps/web`)
- typed client API layer
- API server with deterministic + AI-fallback logic
- shared contracts, UI package, and DB schema/migrations package

## Current local runbook

- Start API: `pnpm --filter api dev`
- Start mobile app: `pnpm --filter mobile start`
- Start web app: `pnpm --filter web dev`
- Run API tests: `pnpm --filter api test`
- Run contracts tests: `pnpm --filter @yurbrain/contracts test`

## Implemented surfaces (Sprints 1–5)

- Brain item CRUD (`/brain-items`)
- Threads/messages (`/threads`, `/messages`)
- Feed generation/ranking loop (`/feed`, `/ai/feed/generate-card`)
- AI summarize/classify/item-query (`/ai/summarize`, `/ai/classify`, `/ai/query`)
- Task conversion + CRUD (`/ai/convert`, `/tasks`, `/tasks/manual-convert`)
- Session lifecycle (`/tasks/:id/start`, `/sessions/:id/pause`, `/sessions/:id/finish`)

## Known current limitation

- API runtime state is still in-memory for MVP behavior and tests. The `packages/db` schema/migrations are present, but runtime DB persistence wiring is planned for later hardening.
