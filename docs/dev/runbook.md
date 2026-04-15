# Yurbrain Local Runbook (Current State)

_Last verified: April 14, 2026 (UTC), after persistence hardening pass._

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

### Cloud agent environment expectation

For Cursor Cloud agent runs, dependencies should be preinstalled by the environment setup agent so contributors do not repeat `pnpm install` on every task.  
Use [cursor.com/onboard](https://cursor.com/onboard) and apply this prompt:

> Inspect this monorepo and update the cloud agent environment config so workspace dependencies are preinstalled at startup using pnpm. Ensure `pnpm --filter web build` and `pnpm --filter api test` run immediately without manual install.

## 3) Start apps (separate terminals)

### API
```bash
pnpm --filter api exec tsx --watch src/index.ts
```
- Runs Fastify on port `3001` with a watch loop that works with the monorepo ESM package setup.

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

Equivalent underlying command (set `NODE_ENV=test` to prevent stray server listeners):

```bash
NODE_ENV=test pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts
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
- Runtime path note: app/API startup and scripts use `@yurbrain/db` repository migrations (including `0005_sprint9.sql`) automatically against PGlite.
- Drizzle CLI migrate remains available for manual workflows.
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
- Inserts a realistic single-user MVP dataset for manual QA:
  - 12 brain items
  - 8 feed cards
  - 3 threads with message history
  - 4 tasks
  - 3 sessions (running + finished history)
  - persisted AI artifact history (summary + classification)
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
- Item detail continuity is persisted via `GET /brain-items/:id/artifacts` (no local-storage dependency for AI artifact history).
- Task/session continuity is persisted via `GET /sessions?taskId=...` and `GET /sessions?userId=...`.
- Feed contract now includes source linkage/action semantics:
  - `taskId`, `availableActions`, `stateFlags`, `whyShown`
- Founder mode + default lens preference is persisted via `GET/PUT /preferences/:userId` (`user_preferences` table), not only browser local storage.
- Capture now runs through a sheet/modal surface in web with:
  - autofocus + autosizing input
  - Save / Save + Plan / Save + Remind Later actions
  - attachment + voice placeholders (voice is a stub)
  - subtle save micro-state before auto-dismiss
- Item detail continuation now uses one inline composer with mode toggle (`Comment` / `Ask Yurbrain`), and both comment + ask interactions append to the same continuity timeline with explicit role labels (`You`, `Yurbrain`).
- Item detail also includes suggested prompt chips and a related-items list so users can branch or return without leaving feed-centered continuity.

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

## 9) Optional reliability improvement for cloud agents

If agents repeatedly spend time reinstalling dependencies, run a dedicated environment setup agent at [cursor.com/onboard](https://cursor.com/onboard) with this prompt:

```text
Preinstall Yurbrain monorepo dependencies in the cloud image (pnpm workspace install), ensure pnpm v10.18.3 is available, and cache workspace node_modules so agents can run pnpm reset, pnpm seed, and pnpm --filter api test without reinstalling dependencies.
```
