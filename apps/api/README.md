Yurbrain API (Fastify + TypeScript + PGlite).

Architecture:
- Fastify HTTP server with route handlers under `src/routes/`
- Embedded PGlite database via `@yurbrain/db` (persists to `.yurbrain-data/`)
- Deterministic + optional LLM-backed AI synthesis via `src/services/ai/`
- Nhost integration for auth (JWT verification) and admin GraphQL via `src/services/nhost/`
- Tests under `src/__tests__/`

Quick start:
- `pnpm dev:api` — starts with `tsx --watch` on port 3001
- `pnpm --filter api test` — runs all API tests
- `pnpm --filter api lint` — TypeScript type check (`tsc --noEmit`)

Health endpoints: `GET /health/live` (liveness), `GET /health/ready` (readiness + DB check).

Environment: see `apps/api/.env.example` and `docs/DEPLOYMENT.md`.
Operational runbook: `docs/dev/runbook.md`.
