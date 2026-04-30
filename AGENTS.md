# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview

Yurbrain is a pnpm + Turborepo monorepo (3 apps, 5 shared packages). The only required service is the Fastify API (`apps/api`, port 3001). It bundles an embedded PGlite database — no external DB, Docker, or AI API keys are needed. The Next.js web app (`apps/web`, port 3000) and Expo mobile app (`apps/mobile`) are optional UI surfaces.

### Running services

- **API server**: `pnpm --filter api exec tsx --watch src/index.ts` (from workspace root). The `pnpm dev:api` script uses `ts-node-dev` which fails due to ESM incompatibility with the `@yurbrain/db` package (`"type": "module"`). Use `tsx --watch` instead for hot-reloading.
- **Web frontend**: `pnpm dev:web` (Next.js on port 3000, requires API running).
- **Database bootstrap**: Run `pnpm reset && pnpm seed` (or `pnpm bootstrap`) for a clean DB with test data. The seeded test user ID is `11111111-1111-1111-1111-111111111111`.

### Lint, test, build

- **Lint**: `pnpm lint` — runs `tsc --noEmit` for the API (only `api` has a lint script configured).
- **Tests**: `pnpm test` — runs all workspace tests (18 tests across 5 packages). Tests use `YURBRAIN_TEST_MODE=1` and each test gets an isolated PGlite instance.
- **E2E**: `pnpm test:e2e` — runs the full-loop smoke test (capture → feed → query → convert → act). The e2e test passes but exits with code 1 due to PGlite process cleanup — this is a known pre-existing issue, not a test failure.
- **Build**: `pnpm build` — runs Turborepo build across all packages.

### Staging / production reference

For deployment configuration and environment variable documentation, see:
- **Environment matrix**: `docs/nhost/environments.md` — canonical per-environment variable reference
- **Deployment plan**: `docs/product/first-production-deployment-plan.md` — phased deployment guide
- **Production checklist**: `docs/nhost/production-launch-checklist.md`
- **CI safety gate**: `.github/workflows/nhost-production-safety.yml` — runs on all PRs and pushes to `main`/`cursor/**`

Key deployment details:
- **Nhost**: Auth + storage via Nhost (`nhost/config.yaml`). Config in `packages/nhost/`, web/mobile clients in `apps/*/src/nhost/`, server admin in `apps/api/src/services/nhost/`.
- **Web deploy (Vercel)**: Set `YURBRAIN_API_ORIGIN` to the deployed API URL for Next.js rewrites in `next.config.ts`. All API routes are proxied via same-origin rewrites.
- **API deploy**: Set `NHOST_PROJECT_ENV=staging|production`, `API_ALLOWED_ORIGINS`, Nhost service URLs, JWT verification vars (`NHOST_JWKS_URL`, `NHOST_JWT_ISSUER`), and `NHOST_ADMIN_SECRET`.
- **LLM**: Optional — set `YURBRAIN_LLM_ENABLED=true` + `YURBRAIN_LLM_API_KEY` for real AI. Deterministic mock used when disabled.
- **Env templates**: Root `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`, `apps/mobile/.env.example`.
- **Safety checks**: `pnpm check:production-safety` runs the full gate (secrets, boundaries, authz, storage, ops, typecheck, lint, test, build).

### Gotchas

- The AI provider is a deterministic mock; no real LLM calls are made unless `YURBRAIN_LLM_ENABLED=true` and `YURBRAIN_LLM_API_KEY` are set.
- The `pnpm dev:api` script (`ts-node-dev`) does not work due to ESM/CJS mismatch with `@yurbrain/db`. Always use `tsx --watch` or `tsx` directly.
- PGlite stores data at `.yurbrain-data/runtime` (dev) or `.yurbrain-data/test-{pid}` (tests).
- The `pnpm test:e2e` exit code 1 is caused by PGlite not releasing resources cleanly; the actual test assertions pass.
- Next.js `next.config.ts` proxies all API routes via rewrites — when adding new API routes, add corresponding rewrite rules.
