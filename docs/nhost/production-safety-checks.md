# Nhost Production Safety Checks

Use this checklist to prevent client secret leakage and configuration drift before merging Nhost-related changes.

## Readiness command sets

Run from repo root:

- Alpha/MVP readiness:
  - `pnpm check:alpha`
- Production safety readiness:
  - `pnpm check:production-safety`

For quick focused checks:

- `pnpm check:secret-leaks`
- `pnpm check:nhost-safety`
- `pnpm test:nhost-safety`
- `pnpm build:nhost-safety`

The CI workflow `.github/workflows/nhost-production-safety.yml` runs `pnpm check:production-safety` on PRs/pushes.

## What each safety check enforces

### `check:secret-leaks`

Runs `tooling/scripts/secret-leak-check.mjs` and fails if:

1. Real env files are tracked (`.env`, `*.env.local`, `*.env.production`, etc.; examples excluded).
2. Tracked files include high-risk patterns (for example `NHOST_ADMIN_SECRET=...`, private keys, AWS secret key literals, GitHub PAT literals).
3. Client runtimes reference server-only secret names:
   - `NHOST_ADMIN_SECRET`
   - `YURBRAIN_NHOST_ADMIN_SECRET`
   - `YURBRAIN_HASURA_ADMIN_SECRET`

### `check:nhost-safety`

Runs `tooling/scripts/nhost-production-safety-check.mjs` and fails if:

1. Client runtime source files (`apps/web`, `apps/mobile`, `packages/client`, `packages/ui`) reference admin-secret env names.
2. `.gitignore` is missing required env ignore entries:
   - `.env`
   - `.env.*`
   - `!.env.example`
   - `!**/.env.example`
3. Required env examples are missing:
   - `.env.example`
   - `apps/api/.env.example`
   - `apps/web/.env.example`
   - `apps/mobile/.env.example`
4. Client env examples mention `NHOST_ADMIN_SECRET`.

### `check:production-safety`

Runs a high-value, bounded sequence:

1. `check:secret-leaks`
2. `check:nhost-safety`
3. `typecheck`
4. `lint`
5. `test:nhost-safety`
6. `build:nhost-safety`

This is the recommended pre-merge gate for production hardening.

## Failure triage guide

### Secret check failed

- Remove real env files from git index and keep only `*.env.example`.
- Move secrets to secret manager/CI vars.
- Replace accidental literal values with placeholders.

### Nhost safety failed

- Ensure client files do not reference admin-secret names.
- Restore required `.gitignore` env ignore patterns.
- Ensure required env example files exist and do not mention admin-secret keys in client templates.

### Typecheck/lint failed

- Resolve compile/lint errors before merging.
- If failure is in unrelated legacy areas, isolate and document separately rather than weakening gate checks.

### Nhost targeted tests/build failed

- `test:nhost-safety` failure usually indicates auth/session/bootstrap regressions.
- `build:nhost-safety` failure indicates deploy/runtime break risk for web surface.
- Fix or revert regressions; do not bypass with flaky retries.

## Manual release checklist

- Verify API-only secrets remain server-side:
  - `NHOST_ADMIN_SECRET`
  - `YURBRAIN_NHOST_ADMIN_SECRET` (deprecated alias)
- Verify all web/mobile runtime keys are public-only (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) and never include admin secrets.
- Verify auth/storage/docs still match `docs/nhost/environments.md`.
