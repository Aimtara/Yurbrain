# Yurbrain Current Implementation State

_Last audited: April 14, 2026 (UTC)._

This document reflects observed behavior in the repository after reading code and running core commands.

## Audit evidence (executed commands)

Passing:
- `pnpm install`
- `pnpm --filter api test`
- `pnpm --filter @yurbrain/contracts test`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm test:e2e`

Failing by design/environment:
- `node --test e2e/full-loop.spec.ts` (Node test runner does not resolve this TypeScript path directly).
- `pnpm --filter @yurbrain/db db:migrate` without reachable Postgres and `DATABASE_URL`.

## Classification legend

- **Real**: implemented and directly supported by code + runnable command path.
- **Partial**: implemented with known limitation (prototype constraints, missing persistence, placeholder tests).
- **Fake/Stale**: doc/script claim not true in current runtime.

## Monorepo and scripts

### Real
- Workspace wiring is active via `pnpm-workspace.yaml` and Turbo (`apps/*`, `packages/*`).
- Root scripts:
  - `bootstrap`, `reset`, `seed`, `reseed`
  - `dev`, `dev:api`, `dev:web`, `dev:mobile`, `dev:all`
  - `test`, `test:e2e`, `lint`, `build`
- `test:e2e` now points to the verified TypeScript-capable command:
  - `pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts`

### Partial
- `pnpm lint` only runs where `lint` is defined (currently `apps/api`).
- `pnpm build` effectively runs only `apps/web` because other packages do not define `build`.

### Fake/Stale
- Historical command `node --test e2e/full-loop.spec.ts` is not a valid e2e path for this repo.

## apps/api

### Real
- Fastify routes are registered for:
  - `brain-items`, `threads/messages`, `feed`, `tasks/sessions`, `ai`, `convert`.
- Zod validation and structured error envelope are active.
- Correlation/request header handling and request-completion logs are active.
- Sprint test suites in `apps/api/src/__tests__` pass.

### Partial
- `/events` exists but intentionally returns `403`.
- Feed behavior is deterministic prototype logic, not durable ranked storage.

### Stubbed/Mocked
- AI provider is deterministic with timeout/invalid-output fallback behavior.
- `/ai/feed/generate-card` returns placeholder-style content when title/body are omitted.

## apps/web

### Real
- Next.js app builds and runs.
- Uses shared `@yurbrain/client` and `@yurbrain/ui`.
- Includes retry/error UI paths for feed and AI-query failures.

### Partial
- Hardcoded demo IDs and prototype UX.
- Relative API calls require matching local host/proxy setup.

## apps/mobile

### Real
- Expo app starts and renders tab shell + capture + feed preview fallback behavior.

### Partial
- Prototype-level flow, no package test script.
- Feed preview is best-effort and falls back to local messaging on failures.

## packages

### `@yurbrain/contracts`
- **Real**: schemas are used by API routes; tests pass.

### `@yurbrain/db`
- **Real**: Drizzle schema + migrations (`0000`-`0003`) exist.
- **Real**: API runtime state is backed by local PGlite storage.
- **Partial**: `db:migrate` script uses Drizzle CLI assumptions and may require explicit connection/env setup.

### `@yurbrain/client`
- **Real**: typed endpoint wrappers and hooks.
- **Partial**: base URL strategy is minimal (`fetch(path)`).
- **Partial**: test script is placeholder echo.

### `@yurbrain/ui`
- **Real**: shared components/tokens/hooks are consumed by apps.
- **Partial**: test script is placeholder echo.

### `@yurbrain/ai`
- **Real**: runner/validate/fallback helpers back API AI services.
- **Partial**: package test script is placeholder echo.

## Documentation reality check (real vs fake)

### Real
- `docs/product/current-state.md` and `docs/dev/runbook.md` are the current operational truth docs.

### Fake/Stale or historical
- `docs/architecture/api-routes-v1.md` lists `/ai/brain-items/:id/...` routes that are not current runtime paths.
  - Real paths in code are `/ai/summarize`, `/ai/classify`, `/ai/query`.
- `docs/product/agent-task-pack.md` and `docs/product/engineering-docs-set.md` include historical ticket/route phrasing for older path shapes.
- `docs/product/monorepo-integration-and-sprint-starter.md` is a bootstrap plan, not a current-state runbook.

## Bottom line

1. Core API loop is real and tested.
2. Persistence is now local DB-backed, but production persistence hardening is still incomplete.
3. DB schema/migrations are real and integrated with local runtime persistence.
4. Web/mobile are working prototypes, not production-ready clients.
5. The e2e command path is now standardized via `pnpm test:e2e`.
