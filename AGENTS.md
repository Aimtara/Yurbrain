# AGENTS.md

## Cursor Cloud specific instructions

### Repository profile

Yurbrain is a `pnpm` + Turborepo monorepo (3 apps, 5 shared packages).

- Required runtime service: Fastify API in `apps/api` (port 3001)
- Optional UI surfaces: Next.js web app in `apps/web` (port 3000), Expo app in `apps/mobile`
- Database: embedded PGlite (no external database, Docker, or AI API keys required)

### Quick start (recommended sequence)

Run from repository root:

1. `pnpm install`
2. `pnpm bootstrap` (or `pnpm reset && pnpm seed`) to create clean local data
3. Start API with:
   - `pnpm --filter api exec tsx --watch src/index.ts`
4. Optionally start web UI:
   - `pnpm dev:web`

Seeded test user id:

- `11111111-1111-1111-1111-111111111111`

### Canonical run commands

- API dev server: `pnpm --filter api exec tsx --watch src/index.ts`
- Web dev server: `pnpm dev:web`
- Reset data: `pnpm reset`
- Seed data: `pnpm seed`
- Bootstrap data: `pnpm bootstrap`

### Validation commands

- Lint: `pnpm lint` (runs `tsc --noEmit` for API package)
- Unit/integration tests: `pnpm test`
- E2E smoke flow: `pnpm test:e2e`
- Build all packages: `pnpm build`

### Known behavior and gotchas

- `pnpm dev:api` uses `ts-node-dev` and is currently broken because of ESM/CJS mismatch with `@yurbrain/db` (`"type": "module"`). Always use `tsx` command above.
- AI provider is deterministic mock logic; no real LLM calls are executed.
- PGlite data lives in:
  - `.yurbrain-data/runtime` for local dev
  - `.yurbrain-data/test-{pid}` for tests
- `pnpm test:e2e` currently exits with code `1` due to PGlite cleanup timing even when assertions pass. Treat this as known pre-existing behavior, not an automatic regression.

### Testing expectations for cloud agents

- Prefer targeted checks for the packages changed, then run broader checks only when needed.
- For API logic changes, at minimum run relevant tests plus `pnpm lint`.
- For cross-package changes, run `pnpm test` and `pnpm build` before handoff when feasible.
