# Yurbrain Local Runbook (Current State)

_Last verified: April 14, 2026 (UTC)._

This runbook lists only commands verified in the current repository state.

## Operator checklist (daily copy/paste)

```bash
# from repo root
pnpm install
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

### Cloud agent environment expectation

For Cursor Cloud agent runs, dependencies should be preinstalled by the environment setup agent so contributors do not repeat `pnpm install` on every task.  
Use [cursor.com/onboard](https://cursor.com/onboard) and apply this prompt:

> Inspect this monorepo and update the cloud agent environment config so workspace dependencies are preinstalled at startup using pnpm. Ensure `pnpm --filter web build` and `pnpm --filter api test` run immediately without manual install.

## 3) Start apps (separate terminals)

### API
```bash
pnpm --filter api dev
```
- Runs Fastify via `ts-node-dev` on port `3001` by default.

### Web
```bash
pnpm --filter web dev
```
- Runs Next.js dev server.

### Mobile
```bash
pnpm --filter mobile start
```
- Runs Expo dev server.

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
- Applies SQL migrations against local persistent PGlite storage by default.
- Optional override paths:
  - `YURBRAIN_DB_PATH` for DB data directory
  - `YURBRAIN_MIGRATIONS_PATH` for migration directory

### Migration generation
```bash
pnpm --filter @yurbrain/db db:generate
```

### Reset DB
```bash
pnpm --filter @yurbrain/db db:reset
```
- Clears and recreates the local DB data directory.

### Seed DB
```bash
pnpm --filter @yurbrain/db db:seed
```
- Inserts deterministic baseline records (brain item, thread/message, feed card, task/session, artifact).
- Optional override:
  - `YURBRAIN_SEED_USER_ID` for seeded user id.

## 7) Reality checks

- API runtime state is DB-backed and survives API restart when using the same DB path.
- `@yurbrain/db` includes first-class `db:reset` and `db:seed` scripts.
- `/events` is intentionally disabled (`403`).
- AI routes include deterministic fallback behavior for timeout/invalid model output.
- Client requests use relative paths (`fetch(path)`), so local API routing/proxy setup controls runtime connectivity.

## 8) Fast sanity loop

```bash
pnpm install
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```
