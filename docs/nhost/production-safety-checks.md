# Nhost Production Safety Checks

Use this checklist to prevent client secret leakage and configuration drift before merging Nhost-related changes.

## Automated checks

Run these commands from repo root:

- `pnpm check:nhost-safety`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:nhost-safety`
- `pnpm build:nhost-safety`

The CI workflow `.github/workflows/nhost-production-safety.yml` executes the same gates on pull requests and pushes.

## What `check:nhost-safety` enforces

1. No client runtime source files (`apps/web`, `apps/mobile`, `packages/client`, `packages/ui`) may reference admin-secret env names:
   - `NHOST_ADMIN_SECRET`
   - `YURBRAIN_NHOST_ADMIN_SECRET`
   - `NEXT_PUBLIC_NHOST_ADMIN_SECRET`
   - `EXPO_PUBLIC_NHOST_ADMIN_SECRET`
2. `.gitignore` must ignore runtime env files and still keep examples committed:
   - `.env`
   - `.env.*`
   - `!.env.example`
   - `!**/.env.example`
3. Required env example files must exist:
   - `.env.example`
   - `apps/api/.env.example`
   - `apps/web/.env.example`
   - `apps/mobile/.env.example`
4. Client env example files must not contain `NHOST_ADMIN_SECRET`.

## Manual release checklist

- Verify API-only secrets remain server-side:
  - `NHOST_ADMIN_SECRET`
  - `YURBRAIN_NHOST_ADMIN_SECRET` (deprecated alias)
- Verify all web/mobile runtime keys are public-only (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) and never include admin secrets.
- Verify auth/storage/docs still match `docs/nhost/environments.md`.
