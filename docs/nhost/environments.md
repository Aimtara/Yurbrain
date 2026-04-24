# Yurbrain Nhost environment & deployment matrix

This document is the canonical environment reference for Nhost + deployment variables.

Use this file as the single source of truth for local, preview, staging, and production.
App-level `.env.example` files intentionally stay concise and point here to avoid duplication.

## Variable classes

- Public web vars: `NEXT_PUBLIC_*` (shipped to browser bundle).
- Public mobile vars: `EXPO_PUBLIC_*` (bundled into mobile app config).
- Server-only vars: plain `NHOST_*` / secrets (`NHOST_ADMIN_SECRET`, JWT secrets, API tokens).

Never place server-only vars in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.

## Shared expectations per environment

| Environment | Nhost project expectation | Deployment intent |
| --- | --- | --- |
| local | Local Nhost stack via `nhost up` or dedicated dev project | Developer machine + local testing |
| preview | Dedicated preview Nhost project (or isolated preview namespace) | Per-PR ephemeral deployment |
| staging | Long-lived non-prod Nhost project mirroring production settings | Final validation/UAT |
| production | Dedicated production Nhost project | Live traffic |

## Environment matrix

### 1) Local

Nhost:

- Use local CLI stack (`nhost up`) or a non-production dev project.
- Typical backend URL: `http://localhost:1337`.

Required vars:

- Root/shared (`.env`):
  - `NHOST_BACKEND_URL`
  - `NHOST_SUBDOMAIN` + `NHOST_REGION` (optional if backend URL is set)
- Web (`apps/web/.env.local`):
  - `NEXT_PUBLIC_NHOST_BACKEND_URL`
  - `NEXT_PUBLIC_NHOST_ANON_KEY`
  - Optional explicit service URLs:
    - `NEXT_PUBLIC_NHOST_GRAPHQL_URL`
    - `NEXT_PUBLIC_NHOST_AUTH_URL`
    - `NEXT_PUBLIC_NHOST_STORAGE_URL`
    - `NEXT_PUBLIC_NHOST_FUNCTIONS_URL`
- Mobile (`apps/mobile/.env`):
  - `EXPO_PUBLIC_NHOST_BACKEND_URL`
  - `EXPO_PUBLIC_NHOST_ANON_KEY`
  - Optional explicit service URLs:
    - `EXPO_PUBLIC_NHOST_GRAPHQL_URL`
    - `EXPO_PUBLIC_NHOST_AUTH_URL`
    - `EXPO_PUBLIC_NHOST_STORAGE_URL`
    - `EXPO_PUBLIC_NHOST_FUNCTIONS_URL`
- API (`apps/api/.env`):
  - `NHOST_BACKEND_URL`
  - `NHOST_ANON_KEY`
  - `NHOST_ADMIN_SECRET` (server-only)
  - Optional explicit service URLs:
    - `NHOST_GRAPHQL_URL`
    - `NHOST_AUTH_URL`
    - `NHOST_STORAGE_URL`
    - `NHOST_FUNCTIONS_URL`

Redirect URLs:

- Web:
  - `NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL=http://localhost:3000/`
  - `NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL=http://localhost:3000/`
  - `NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/auth/reset-password`
  - `NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL=http://localhost:3000/auth/verify`
- Mobile:
  - `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL=<expo_or_app_scheme_url>`
  - `EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL=<mobile_deep_link>`
  - `EXPO_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL=<mobile_deep_link>`
  - `EXPO_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL=<mobile_deep_link>`
  - `EXPO_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL=<mobile_deep_link>`

CORS / domains:

- Allow `http://localhost:3000`, Expo local origin(s), and API dev origin.
- Keep wildcard CORS disabled in deployed environments; local-only wildcard is acceptable for dev bootstrap.

Secret rotation:

- Rotate local admin secret if accidentally exposed in client envs.
- Treat shared local `.env` as sensitive.

### 2) Preview

Nhost:

- Use an isolated preview project (preferred) or strict per-branch namespace.
- Never point preview deployments at production Nhost.

Required vars:

- Same variable set as local, but with preview URLs/keys.
- Web public vars are injected by preview host.
- Mobile preview builds (if used) require `EXPO_PUBLIC_*` preview values.
- API preview runtime requires `NHOST_ADMIN_SECRET` server-side only.

Redirect URLs:

- Web redirect URLs should use the preview deployment hostname.
- Mobile redirect URLs should use preview app deep-link scheme/host mapping.

CORS / domains:

- Allow only preview web host(s) + required mobile scheme callback hosts.
- Remove localhost-only origins in shared preview settings.

Secret rotation:

- Rotate preview secrets on schedule and after contributor offboarding.
- Auto-expire preview environments where possible.

### 3) Staging

Nhost:

- Long-lived staging project mirroring production auth/storage/permission settings.

Required vars:

- Same keys as preview/production.
- Keep staging-specific values separate from production in secret manager.

Redirect URLs:

- Web redirect URLs should use staging domain(s) only.
- Mobile redirect URLs should use staging app deep-link callback targets.

CORS / domains:

- Restrict to staging web domain(s), staging mobile callback hosts, and staging API origin.
- Validate auth redirect allowlist and CORS list together to avoid mismatch.

Secret rotation:

- Rotate staging `NHOST_ADMIN_SECRET` and related server secrets regularly.
- Run rotation drill before production rotation windows.

### 4) Production

Nhost:

- Dedicated production project/subdomain.
- Production should never reuse staging/local anon/admin keys.

Required vars:

- Web deploy env:
  - `NEXT_PUBLIC_NHOST_BACKEND_URL` or `NEXT_PUBLIC_NHOST_SUBDOMAIN` + `NEXT_PUBLIC_NHOST_REGION`
  - `NEXT_PUBLIC_NHOST_ANON_KEY`
  - Auth redirect vars (`NEXT_PUBLIC_NHOST_*_REDIRECT_URL`)
  - Optional explicit service URLs
- Mobile build env:
  - `EXPO_PUBLIC_NHOST_BACKEND_URL` or `EXPO_PUBLIC_NHOST_SUBDOMAIN` + `EXPO_PUBLIC_NHOST_REGION`
  - `EXPO_PUBLIC_NHOST_ANON_KEY`
  - `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`
  - Auth redirect vars (`EXPO_PUBLIC_NHOST_*_REDIRECT_URL`)
  - Optional explicit service URLs
- API deploy env:
  - `NHOST_BACKEND_URL` or `NHOST_SUBDOMAIN` + `NHOST_REGION`
  - `NHOST_ANON_KEY`
  - `NHOST_ADMIN_SECRET` (server-only)
  - Optional explicit service URLs
  - Optional operational redirect refs:
    - `NHOST_AUTH_REDIRECT_SIGN_IN_URL`
    - `NHOST_AUTH_REDIRECT_SIGN_OUT_URL`
    - `NHOST_AUTH_REDIRECT_SIGN_UP_URL`
    - `NHOST_AUTH_REDIRECT_PASSWORD_RESET_URL`
    - `NHOST_AUTH_REDIRECT_EMAIL_VERIFICATION_URL`

Redirect URLs:

- Must exactly match allowed redirect list in Nhost auth settings.
- Include canonical production web domain and mobile app callback scheme(s).

CORS / domains:

- Allow only production web/mobile origins.
- Avoid wildcard `*` for authenticated API traffic.
- Validate API CORS list and Nhost redirect/domain allowlists on each release.

Secret rotation:

- Rotate `NHOST_ADMIN_SECRET` and server API tokens on a fixed cadence.
- Rotate immediately after incident, credential leak suspicion, or team access changes.
- Maintain dual-secret rollout playbook (new secret + overlap + revoke old).

## Root `.env.example` vs app-level `.env.example`

- Root `.env.example`: shared/cross-app baseline variables and naming guidance.
- App-level `.env.example`: only app-consumed variables.
- Detailed per-environment values belong in this matrix document (`docs/nhost/environments.md`).

## Related docs

- Local workflow: `docs/dev/nhost-local-setup.md`
- Auth behavior + redirect semantics: `docs/nhost/auth.md`
- Storage hardening: `docs/nhost/storage.md`
- Permissions model: `docs/nhost/permissions.md`
