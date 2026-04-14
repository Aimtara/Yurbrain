# Yurbrain Monorepo Starter

This monorepo contains a **Sprint 6 engineering prototype** of the Yurbrain MVP loop.


> Status note (April 14, 2026): route/service and test implementation breadth is strong, but runtime persistence and product-grade UX are still in progress. See `docs/product/current-state.md` for the authoritative status.

For remaining gaps and an explicit checklist of unresolved items, see `docs/product/current-state.md`.

For implementation sequencing, use `docs/product/ai-agent-execution-guide.md`.

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

- Bootstrap from scratch: `pnpm bootstrap`
- Reset DB: `pnpm reset`
- Seed DB with usable test data: `pnpm seed`
- Start API: `pnpm dev` (alias of `pnpm dev:api`)
- Start mobile app: `pnpm dev:mobile`
- Start web app: `pnpm dev:web`
- Run API tests: `pnpm --filter api test`
- Run contracts tests: `pnpm --filter @yurbrain/contracts test`

## Implemented surfaces (Sprints 1–6)

- Brain item CRUD (`/brain-items`)
- Threads/messages (`/threads`, `/messages`)
- Feed generation/ranking loop (`/feed`, `/ai/feed/generate-card`)
- AI summarize/classify/item-query (`/ai/summarize`, `/ai/classify`, `/ai/query`)
- Task conversion + CRUD (`/ai/convert`, `/tasks`, `/tasks/manual-convert`)
- Session lifecycle (`/tasks/:id/start`, `/sessions/:id/pause`, `/sessions/:id/finish`)
- Observability middleware (`x-correlation-id`, structured error envelopes, request timing logs)

## Sprint 6 QA + observability hardening runbook

1. **Start API and exercise critical routes**
   - `pnpm --filter api dev`
   - Validate correlation IDs by calling `/feed` with and without `x-correlation-id`.
2. **Run reliability tests**
   - `pnpm --filter api test`
   - Confirm `apps/api/src/__tests__/sprint6` passes.
3. **Run full loop smoke test**
   - `pnpm test:e2e`
   - Covers capture → feed resurface → query → convert → act flow.
4. **Check fallback behavior manually**
   - Web: if feed request fails, retry prompt appears.
   - Mobile: feed failure reroutes to Brain tab with retry CTA.
5. **Log review checklist**
   - Ensure logs include `event`, `correlationId`, route metadata, and AI fallback signals.

## Known current limitation

- Core persistence is DB-backed, but UX/workflow behavior is still prototype-level and not production-hardened.
