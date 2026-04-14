# Yurbrain Local Runbook (Current State)

_Last verified: April 14, 2026 (UTC)._

This runbook lists only commands verified in the current repository state.

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
- Requires reachable Postgres via `DATABASE_URL`.
- Fails in default environments without DB connectivity.

### Migration generation
```bash
pnpm --filter @yurbrain/db db:generate
```

## 7) Reality checks

- API runtime state is in-memory and resets on API restart.
- There is no first-class seed/reset script at root or in `@yurbrain/db`.
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
