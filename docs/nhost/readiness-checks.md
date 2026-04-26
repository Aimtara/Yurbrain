# MVP/Alpha readiness checks

This document defines the high-signal readiness commands for MVP/Alpha and how to interpret failures quickly.

## Commands

Run from repository root:

- `pnpm install`
- `pnpm check:secrets`
- `pnpm check:security`
- `pnpm check:authz-smoke`
- `pnpm check:storage-smoke`
- `pnpm check:ops-smoke`
- `pnpm check:alpha`
- `pnpm check:production-safety`

### What each command covers

- `pnpm install`
  - dependency install / lockfile consistency.
- `pnpm check:secrets`
  - compatibility alias for `check:secret-leaks` used by operator runbooks.
- `pnpm check:alpha`
  - secret leak guard (`check:secret-leaks`)
  - Nhost env/secret hygiene guard (`check:nhost-safety`)
  - workspace typecheck + lint
  - unit/integration suites for highest-value surfaces:
    - `api`
    - `@yurbrain/client`
    - `@yurbrain/db`
    - `mobile`
  - web production build smoke (`apps/web`)
- `pnpm check:production-safety`
  - strict production-oriented local composite:
    - `check:security`
    - `check:authz-smoke`
    - `check:storage-smoke`
    - `check:ops-smoke`
    - `check:alpha-smoke`
- `pnpm check:authz-smoke`
  - strict identity fallback denial,
  - JWT validation,
  - high-value two-user isolation,
  - route-specific authz denial coverage,
  - rate-limit and health/readiness smoke.
- `pnpm check:storage-smoke`
  - attachment metadata migration smoke,
  - local PGlite backup/restore drill smoke.
- `pnpm check:ops-smoke`
  - unauthenticated liveness/readiness endpoint smoke.

## Failure interpretation guide

### 1) `check:secret-leaks` fails

Likely cause:

- committed secret-like token/password/private key pattern detected.

What to do:

1. inspect reported file + line + matched pattern
2. remove/redact real secret material
3. replace with placeholders in docs/examples/tests
4. rotate any accidentally exposed credential immediately

### 2) `check:nhost-safety` fails

Likely cause:

- client code references admin-secret env keys,
- `.gitignore` missing env ignore rules,
- required `.env.example` files missing,
- client env example mentions admin secret key names.

What to do:

1. move server secrets to API/server runtime only
2. restore required `.gitignore` env ignore entries
3. add missing env examples
4. keep client examples strictly `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`

### 3) `typecheck` / `lint` fails

Likely cause:

- compile-time API/contract mismatch,
- stale type usage after contract changes.

What to do:

1. fix type errors first (usually unlocks lint)
2. verify contracts and callers are updated together

### 4) unit tests fail (`api`, `client`, `db`, `mobile`)

Likely cause:

- behavior regression or updated contracts without test updates.

What to do:

1. run failing package suite in isolation
2. fix runtime behavior first, then test expectations
3. avoid disabling tests unless explicitly deprecated

### 5) build fails (`web`)

Likely cause:

- browser/runtime import mismatch,
- env assumptions invalid at build time.

What to do:

1. check unresolved imports and client/server boundary usage
2. ensure required public env keys are documented and safe

## CI strategy

The workflow `.github/workflows/nhost-production-safety.yml` now runs the expanded production-safety sequence on Node 22:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm build`
6. `pnpm check:security`
7. `pnpm check:authz-smoke`
8. `pnpm check:storage-smoke`

Rationale:

- high signal for Alpha/production readiness
- direct visibility into each gate step
- includes strict authz and storage/restore smoke without claiming staging proof

## Current intentional gaps

- no full end-to-end GUI smoke in CI (kept manual to avoid flaky browser automation)
- no staging dashboard/alert/rollback proof in CI
- storage object upload/read/delete lifecycle remains production-deferred

Use targeted manual QA + release checklist for UI flows that cannot be validated reliably in headless CI.

## Required manual signoff artifacts (top release blockers)

Command gates alone are not sufficient for Alpha/production launch.
Record these manual artifacts for each release candidate:

1. Alpha smoke execution report:
   - `docs/qa/alpha-smoke-execution-report-template.md`
2. Staging + production smoke signoff:
   - `docs/nhost/staging-production-smoke-report-template.md`
3. Backup/restore drill record:
   - `docs/nhost/backup-restore-drill-runbook.md`
4. Secret rotation validation record:
   - `docs/nhost/secret-rotation-validation-runbook.md`
5. Monitoring/incident readiness record:
   - `docs/nhost/incident-response-readiness-runbook.md`
