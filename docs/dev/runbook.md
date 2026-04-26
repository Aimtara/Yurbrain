# Yurbrain Local Runbook (Current State)

_Last updated: April 26, 2026 (UTC), during enterprise production hardening._

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
pnpm typecheck
pnpm build
pnpm check:alpha-smoke
pnpm check:security
pnpm check:authz-smoke
pnpm check:storage-smoke
pnpm check:production-safety
pnpm test:e2e
```

If any command fails, stop and reconcile `docs/dev/current-state.md` before proceeding.


## Nhost local orchestrator setup

If you are working on Nhost migration slices, use `docs/dev/nhost-local-setup.md` for a clean from-scratch setup with Docker + Nhost CLI.

Quick Nhost commands:

```bash
nhost init
nhost link
nhost up
```

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
- Prefer this command over `pnpm --filter api dev` until the package script is aligned; the older `ts-node-dev` path has ESM compatibility issues with workspace packages.

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
- Includes API, client, DB, UI, AI, contracts, and mobile package tests where package tests are defined.
- Some workspaces are source-consumed library packages; build output is intentionally a documented no-op for those packages.

### Lint
```bash
pnpm lint
```
- Runs Turbo `lint` tasks across all workspaces.
- Package lint scripts are TypeScript-backed where a dedicated linter is not configured.

### Build
```bash
pnpm build
```
- Runs Turbo `build` tasks.
- Web performs a real Next.js production build. Source-consumed packages and mobile expose explicit documented no-op builds; mobile production build remains deferred until mobile enters launch scope.

### Typecheck
```bash
pnpm typecheck
```
- Runs Turbo `typecheck` tasks after the production-hardening script normalization.
- Every production-impacting workspace must either typecheck or provide an explicit no-op rationale in its package script.

### Production-hardening gates
```bash
pnpm check:security
pnpm check:authz-smoke
pnpm check:storage-smoke
pnpm check:ops-smoke
pnpm check:alpha-smoke
pnpm check:production-safety
```
- `check:security`: secret-leak and Nhost production-safety checks.
- `check:authz-smoke`: strict identity, JWT, rate-limit, health/readiness, and high-value cross-user isolation tests.
- `check:storage-smoke`: current storage metadata smoke plus local PGlite backup/restore drill. This is **not** proof of production attachment upload/read/delete until storage lifecycle routes exist.
- `check:ops-smoke`: local API liveness/readiness smoke.
- `check:alpha-smoke`: local verification sweep for tests, lint, typecheck, and build.
- `check:production-safety`: composite safety gate. Production still requires staging proof, storage lifecycle evidence, rollback, backup/restore, and incident readiness.

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

## 7) AI provider foundation (L1)

The API now includes an isolated provider foundation at:

- `apps/api/src/services/ai/provider/config.ts`
- `apps/api/src/services/ai/provider/client.ts`
- `apps/api/src/services/ai/provider/index.ts`

Current behavior is unchanged: user-facing AI routes still use deterministic/fallback logic.

### Provider env keys (future feature wiring)

- `YURBRAIN_LLM_ENABLED` (`true`/`false`, default `true`)
- `YURBRAIN_LLM_PROVIDER` (currently `openai`)
- `YURBRAIN_LLM_API_KEY` (required to enable real provider path)
- `YURBRAIN_LLM_BASE_URL` (optional, defaults to `https://api.openai.com/v1`)
- `YURBRAIN_LLM_MODEL` (optional, defaults to `gpt-4o-mini`)
- `YURBRAIN_LLM_TIMEOUT_MS` (optional, defaults to `1800`)
- `YURBRAIN_LLM_MAX_OUTPUT_TOKENS` (optional, defaults to `220`)
- `YURBRAIN_LLM_TEMPERATURE` (optional, defaults to `0.2`)

### Integration rule

When adding real-LLM behavior in a feature slice, call `invokeLlm(...)` from
`apps/api/src/services/ai/provider/index.ts` and keep deterministic fallback behavior in the calling service.

## 8) Thin real-provider synthesis baselines (L2 + L3 + L4 hardening)

`POST /functions/summarize-progress` and `POST /functions/what-should-i-do-next` are now thin real-provider slices with strict fallback safety.

### Operational guarantees

- Deterministic synthesis is always computed first.
- Any provider-path failure returns deterministic fallback (never blocks the route):
  - provider not configured
  - provider timeout
  - provider HTTP/transport error
  - model output parse/validation failure
  - prompt-grounding assembly failure
- Successful provider output must include grounded `sourceSignals`:
  - summarize-progress: `1-4` required
  - what-should-i-do-next: `1-4` required
  - empty arrays are treated as parse failure and fallback is used.
- Successful provider output must stay concise and non-chatty:
  - summarize-progress: concise operational summary + one concrete next step
  - what-should-i-do-next: single-line summary + one immediate action
- Next-step output confidence is always bounded and present:
  - provider success: validated model confidence (`0..1`)
  - deterministic fallback: stable default confidence (`0.35`)
- L4 hardening baseline:
  - shared fallback classification normalizes provider + parse failures to stable fallback reasons
  - fallback logs include `fallbackStage`, `fallbackOrder`, `errorCode`, and `errorName`
  - grounding, invoke, and parse fallbacks are attributed explicitly for both summarize-progress and next-step (`fallbackStage`: `grounding` | `invoke` | `parse`)
  - both summarize-progress and next-step emit consistent LLM lifecycle events

### Anti-staleness checks for this slice

When changing summarize-progress or next-step prompt/orchestration/contracts:

1. Run `pnpm --filter api exec tsx --test src/__tests__/sprint12/summarize-progress-llm.test.ts`
2. Run `pnpm --filter api exec tsx --test src/__tests__/sprint12/what-should-i-do-next-llm.test.ts`
3. Run `pnpm --filter api exec tsx --test src/__tests__/sprint12/ai-synthesis.test.ts`
4. Run `pnpm --filter @yurbrain/contracts test`
5. Confirm docs stay aligned in:
   - `docs/architecture/ai-contracts-v1.md`
   - `docs/api/README.md`
   - this runbook section

If any one of these drifts from behavior, update docs in the same change.

## 9) Reality checks

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
- Convert `plan_suggested` outcomes now open a Plan Preview sheet in web with editable step durations, supportive capacity warning, and actions to accept plan or start first step (creating real tasks through existing task routes).
- Time home now includes deterministic window planning (`2h`, `4h`, `6h`, `8h`, `24h`, `Custom`), session resume card, tasks-that-fit suggestions, and a start-without-planning action.
- Finishing a session now opens a supportive Finish/Rebalance sheet with planned vs actual timing, reclaimed/overflow delta, and next-step actions (Continue plan, Rebalance day, Take a break, Schedule rest later).
- Feed postpone now opens a lightweight Postpone/Reschedule sheet with one-tap actions (Later today, Tomorrow, Suggest a slot, Break into smaller step), optional custom datetime slot, and persisted postpone count metadata for future ranking influence.
- Me surface now provides lightweight insights (top insight, estimation accuracy, carry-forward pattern, postponement pattern, recommendation) computed deterministically from persisted tasks/sessions/feed data.
- Personalization settings now persist through `GET/PUT /preferences/:userId` with values:
  - `renderMode`: `focus` | `explore` (Focus remains default; Explore is preference-only for now)
  - `aiSummaryMode`: `concise` | `balanced` | `detailed`
  - `feedDensity`: `comfortable` | `compact`
  - `resurfacingIntensity`: `gentle` | `balanced` | `active`
- Explore contract scaffolding is now available via optional `feed.explore` metadata (`clusterId`, `position`, `salience`, `relationships`, grouping fields); this is contract-only and does not alter Focus-mode rendering.
- Focus mode now uses the active session screen as an execution surface with:
  - task hero and live session timer
  - pause and finish controls wired to real session routes
  - context peek from the linked source item with quick-open back to item detail

## 10) Fast sanity loop

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

## 11) Optional reliability improvement for cloud agents

If agents repeatedly spend time reinstalling dependencies, run a dedicated environment setup agent at [cursor.com/onboard](https://cursor.com/onboard) with this prompt:

```text
Preinstall Yurbrain monorepo dependencies in the cloud image (pnpm workspace install), ensure pnpm v10.18.3 is available, and cache workspace node_modules so agents can run pnpm reset, pnpm seed, and pnpm --filter api test without reinstalling dependencies.
```
