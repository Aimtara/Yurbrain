# Yurbrain Local Runbook (Current State)

_Last verified: April 14, 2026 (UTC)._

This runbook lists only commands verified in the current repository state.

## Operator checklist (daily copy/paste)

```bash
# from repo root
pnpm install
pnpm reset
pnpm seed
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```

If any command fails, stop and reconcile `docs/product/current-state.md` before proceeding.

## 1) Prerequisites

- Node.js 22.x (verified with Node `v22.22.2` in this audit run).
- pnpm 10.x (repo uses `pnpm@10.18.3`).
- Optional: local Postgres only if running DB migrations.

## 2) Install

```bash
pnpm install
```

Expected: succeeds. You may see a warning about ignored build scripts (`esbuild`, `sharp`).

## 3) Start apps (separate terminals)

### API
```bash
pnpm dev
```
- Runs Fastify via `ts-node-dev` on port `3001` by default.

### Web
```bash
pnpm dev:web
```
- Runs Next.js dev server.

### Mobile
```bash
pnpm dev:mobile
```
- Runs Expo dev server.

### Optional: run all dev processes together
```bash
pnpm dev:all
```
- Runs API + web + mobile dev commands in parallel via Turbo.

## 4) Quality and test commands

### API and contracts tests
```bash
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
```

### Monorepo test sweep
```bash
pnpm test
```
- Runs Turbo `test` tasks.
- Note: some package `test` scripts are placeholder echoes (`@yurbrain/ai`, `@yurbrain/client`, `@yurbrain/ui`).

### Lint
```bash
pnpm lint
```
- Runs Turbo `lint` tasks.
- Current practical lint coverage is limited to packages that define `lint` (currently `apps/api`).

### Build
```bash
pnpm build
```
- Runs Turbo `build` tasks.
- Current practical build workload is `apps/web`.

## 5) E2E smoke test

Use the root alias:

```bash
pnpm test:e2e
```

Equivalent underlying command:

```bash
pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts
```

Avoid using:

```bash
node --test e2e/full-loop.spec.ts
```

That direct Node command fails in this repo setup.

## 6) Database commands

### Migrations
```bash
pnpm --filter @yurbrain/db db:migrate
```
- Applies SQL migrations using Drizzle CLI.
- Optional override paths:
  - `YURBRAIN_DB_PATH` for DB data directory
  - `YURBRAIN_MIGRATIONS_PATH` for migration directory

### Migration generation
```bash
pnpm --filter @yurbrain/db db:generate
```

### Reset DB
```bash
pnpm reset
```
- Clears and recreates the local runtime DB data directory.
- Default path: `<repo>/.yurbrain-data/runtime`

### Seed DB
```bash
pnpm seed
```
- Inserts a usable multi-entity dataset (brain items, events, threads/messages, feed cards, tasks/sessions, artifacts).
- Optional override:
  - `YURBRAIN_SEED_USER_ID` for seeded user id.

### Reset + seed
```bash
pnpm reseed
```
- Reliable baseline setup for local demos and end-to-end manual checks.

## 7) Reality checks

- API runtime state is DB-backed and survives API restart when using the same DB path.
- `@yurbrain/db` includes first-class `db:reset` and `db:seed` scripts.
- `/events` is intentionally disabled (`403`).
- AI routes include deterministic fallback behavior for timeout/invalid model output.
- Client requests use relative paths (`fetch(path)`), so local API routing/proxy setup controls runtime connectivity.

## 8) Fast sanity loop

```bash
pnpm install
pnpm reset
pnpm seed
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```
