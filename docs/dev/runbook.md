# Yurbrain Local Runbook (Current State)

_Last verified: April 14, 2026 (UTC)._

This runbook documents what works locally in the current repository state.

## 1) Prerequisites

- Node.js 20.x (verified with Node 20.19.6).
- pnpm 10.x (repo uses `pnpm@10.18.3`).
- Optional: local Postgres only if you want to run DB migrations.

## 2) Install

```bash
pnpm install
```

Observed result: succeeds; warning about ignored build scripts (`esbuild`, `sharp`) may appear.

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

## 4) Quality/test commands

### Package-level tests
```bash
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
```
- Both pass in current state.

### Monorepo test sweep
```bash
pnpm test
```
- Passes.
- Note: some package test scripts are placeholder echo commands (`@yurbrain/ai`, `@yurbrain/client`, `@yurbrain/ui`).

### Lint
```bash
pnpm lint
```
- Passes after current fixes in this audit pass.
- Current lint scope effectively depends on which packages define a `lint` script.

### Build
```bash
pnpm build
```
- Passes; currently active build workload is `apps/web`.

## 5) E2E smoke test

### Command that currently fails
```bash
node --test e2e/full-loop.spec.ts
```
- Fails because Node test runner does not natively execute `.ts` files here.

### Working TypeScript-capable command
```bash
pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts
```
- Passes.

## 6) Database commands

### Migrations
```bash
pnpm --filter @yurbrain/db db:migrate
```
- Requires a reachable Postgres configured via `DATABASE_URL`.
- In a default environment without DB, this fails.

### Generation
```bash
pnpm --filter @yurbrain/db db:generate
```
- Available, but not required for routine local app/test runs unless schema changes are made.

## 7) Persistence and reset reality check

- API runtime state is in-memory and resets on API restart.
- There is no repo-standard seed/reset script yet.
- Tests are mostly integration-style via `app.inject` and do not require a running external DB.

## 8) Fast sanity loop

```bash
pnpm install
pnpm --filter api test
pnpm --filter @yurbrain/contracts test
pnpm test
pnpm lint
pnpm build
pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts
```

## 9) Known operational caveats

- `/events` endpoint is intentionally disabled (`403`).
- AI routes can return deterministic fallback responses when AI runner output is invalid/times out.
- Client packages call relative API paths; local proxy/base-url setup still determines runtime connectivity in web/mobile dev.
