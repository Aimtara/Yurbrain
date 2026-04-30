# Deployment Reference

Quick reference for deploying Yurbrain to staging and production. For the full environment variable matrix, see `docs/nhost/environments.md`.

## Architecture

| Component | Stack | Port | Deploy target |
|-----------|-------|------|---------------|
| **API** (`apps/api`) | Fastify + PGlite + tsx | 3001 | Railway / Render / Fly.io |
| **Web** (`apps/web`) | Next.js 15 | 3000 | Vercel |
| **Mobile** (`apps/mobile`) | Expo / React Native | — | Expo EAS |
| **Auth + Storage** | Nhost | — | Nhost cloud |
| **Database** | PGlite (embedded) or Postgres | — | Embedded / Supabase / Neon / Railway |

## External services

### Nhost

Auth and storage are provided by Nhost. Configuration lives in:
- `nhost.toml` — project definition (Postgres version, auth/storage enabled)
- `nhost/metadata/` — Hasura metadata (tables, permissions)
- `packages/nhost/` — shared SDK wrapper (`@yurbrain/nhost`)
- `apps/*/src/nhost/` — per-app Nhost client initialization

The root `functions/` directory is intentionally absent from the deployable tree. Draft serverless-function migration code lives under `.functions-draft/` so Nhost does not try to build monorepo-local package imports during staging deploys. The production `/functions/*` API routes are served by `apps/api`.

Dashboard setup required:
- Auth → redirect URL allowlist must match web/mobile redirect env vars
- Auth → allowed domains must match deployed origins
- Storage → buckets: `avatars`, `capture_assets`, `imports` (see `docs/nhost/storage.md`)

### LLM provider (optional)

The API uses an OpenAI-compatible LLM provider for AI features. When `YURBRAIN_LLM_ENABLED` is `false` or `YURBRAIN_LLM_API_KEY` is unset, a deterministic mock provider is used instead.

```
YURBRAIN_LLM_ENABLED=true
YURBRAIN_LLM_PROVIDER=openai
YURBRAIN_LLM_API_KEY=sk-...
YURBRAIN_LLM_BASE_URL=https://api.openai.com/v1
YURBRAIN_LLM_MODEL=gpt-4o-mini
```

## Environment setup by deploy target

### API (Railway / Render / Fly.io)

Required environment variables:

```bash
# Deployment tier — drives CORS strictness, rate limits, identity enforcement
NHOST_PROJECT_ENV=staging  # or production

# Nhost addressing (at least one mode)
NHOST_BACKEND_URL=https://<subdomain>.nhost.run
# OR: NHOST_SUBDOMAIN=<subdomain> + NHOST_REGION=<region>

# Auth/JWT verification
NHOST_ANON_KEY=<anon-key>
NHOST_ADMIN_SECRET=<admin-secret>
NHOST_JWKS_URL=https://<subdomain>.auth.<region>.nhost.run/v1/.well-known/jwks.json
NHOST_JWT_ISSUER=https://<subdomain>.auth.<region>.nhost.run/v1

# CORS — comma-separated allowed origins
API_ALLOWED_ORIGINS=https://yurbrain.vercel.app,https://yurbrain.com

# Server
PORT=3001
NODE_ENV=production
```

Optional:
```bash
NHOST_JWT_AUDIENCE=<audience>
NHOST_GRAPHQL_URL=<explicit-graphql-url>
NHOST_AUTH_URL=<explicit-auth-url>
NHOST_STORAGE_URL=<explicit-storage-url>
YURBRAIN_LLM_ENABLED=true
YURBRAIN_LLM_API_KEY=sk-...
```

Health endpoints: `GET /health/live` (liveness), `GET /health/ready` (readiness + DB check).

### Web (Vercel)

Required environment variables:

```bash
# API proxy target for Next.js rewrites
YURBRAIN_API_ORIGIN=https://api.yurbrain.com

# Nhost public addressing
NEXT_PUBLIC_NHOST_BACKEND_URL=https://<subdomain>.nhost.run
NEXT_PUBLIC_NHOST_ANON_KEY=<anon-key>

# Auth redirects (must match Nhost dashboard allowlist)
NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL=https://yurbrain.com/
NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL=https://yurbrain.com/
NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL=https://yurbrain.com/auth/reset-password
NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL=https://yurbrain.com/auth/verify
```

The `next.config.ts` rewrites proxy all API routes (`/auth/*`, `/capture/*`, `/brain-items/*`, `/feed/*`, `/functions/*`, `/threads/*`, `/messages/*`, `/preferences/*`, `/tasks/*`, `/sessions/*`, `/explore/*`, `/ai/*`, `/health/*`, `/events`) to the `YURBRAIN_API_ORIGIN`.

### Mobile (Expo EAS)

Required environment variables:

```bash
EXPO_PUBLIC_YURBRAIN_API_URL=https://api.yurbrain.com
EXPO_PUBLIC_NHOST_BACKEND_URL=https://<subdomain>.nhost.run
EXPO_PUBLIC_NHOST_ANON_KEY=<anon-key>
EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL=yurbrain://

# Auth redirects
EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL=yurbrain://auth/callback
EXPO_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL=yurbrain://
```

## CI/CD

GitHub Actions workflow (`.github/workflows/nhost-production-safety.yml`) runs on all PRs and pushes to `main`/`cursor/**`:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build`
3. `pnpm check:security` (secret leak scan + Nhost safety)
4. `pnpm check:package-boundaries`
5. `pnpm check:authz-smoke` + `pnpm check:storage-smoke` + `pnpm check:ops-smoke`
6. `pnpm check:production-safety` (full composite)
7. `pnpm test:e2e`

## Smoke testing deployed environments

```bash
# Set target API URL and auth tokens
export YURBRAIN_API_URL=https://api-staging.yurbrain.com
export YURBRAIN_TOKEN_A=<jwt-token-user-a>
export YURBRAIN_TOKEN_B=<jwt-token-user-b>

# Run staging smoke
pnpm smoke:staging

# Run two-user isolation smoke
pnpm smoke:two-user-isolation
```

## Security checklist

- [ ] `NHOST_ADMIN_SECRET` is server-only (never in `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`)
- [ ] `YURBRAIN_TEST_MODE` is never set in staging/production
- [ ] `API_ALLOWED_ORIGINS` lists only actual deployed origins
- [ ] Nhost dashboard redirect allowlist matches env redirect vars
- [ ] `pnpm check:production-safety` passes in CI
- [ ] Secret rotation schedule established (see `docs/nhost/secret-rotation-validation-runbook.md`)

## Related documentation

| Doc | Path |
|-----|------|
| Environment matrix | `docs/nhost/environments.md` |
| Production deployment plan | `docs/product/first-production-deployment-plan.md` |
| Production launch checklist | `docs/nhost/production-launch-checklist.md` |
| Auth configuration | `docs/nhost/auth.md` |
| Storage hardening | `docs/nhost/storage.md` |
| Permissions model | `docs/nhost/permissions.md` |
| Observability | `docs/nhost/observability.md` |
| Secret rotation | `docs/nhost/secret-rotation-validation-runbook.md` |
| Incident response | `docs/nhost/incident-response-readiness-runbook.md` |
| Backup/restore | `docs/nhost/backup-restore-drill-runbook.md` |
| Staging/prod smoke template | `docs/nhost/staging-production-smoke-report-template.md` |
| Secrets policy | `docs/compliance/SECRETS_AND_ENVIRONMENT.md` |
