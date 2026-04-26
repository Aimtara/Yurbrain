# Secrets and Environment Inventory

Status: alpha governance baseline.

## Secret handling rules

- Do not expose Nhost admin secrets, Hasura admin secrets, JWT signing keys, or AI provider keys to web/mobile bundles.
- Public client environment variables must be limited to public Nhost/API configuration and public app URLs.
- Server-only secrets must be stored in the deployment secret manager, not committed files.
- `.env.example` may contain names and placeholders only.
- `pnpm check:security` must pass before every release candidate.

## Environment groups

| Group | Examples | Public? | Notes |
| --- | --- | --- | --- |
| API runtime | `NODE_ENV`, `NHOST_PROJECT_ENV`, `API_ALLOWED_ORIGINS`, `YURBRAIN_ALLOWED_ORIGINS` | No | Staging/prod require explicit origins. |
| JWT validation | `NHOST_JWKS_URL`, `NHOST_JWT_ISSUER`, `NHOST_JWT_AUDIENCE` | No | Must match auth provider. |
| Nhost server | `NHOST_ADMIN_SECRET`, `YURBRAIN_HASURA_ADMIN_SECRET` | No | Server-only; never web/mobile. |
| Nhost public | `NEXT_PUBLIC_NHOST_*`, `EXPO_PUBLIC_NHOST_*` | Yes, if public-safe | No admin secrets. |
| AI provider | `YURBRAIN_LLM_*` | No, except non-secret flags if needed | Provider rollout remains gated. |
| Rate limits | `YURBRAIN_RATE_LIMIT_*` | No | Production-like envs cannot disable all limits. |

## Required release checks

- `pnpm check:secret-leaks`
- `pnpm check:nhost-safety`
- Review production env values against `docs/readiness/PRODUCTION_GATE.md`.
- Rotate any secret suspected of exposure before launch resumes.
