# Yurbrain Nhost environment & deployment matrix

This document is the canonical environment reference for Nhost + deployment variables.

Use this file as the single source of truth for local, preview, staging, and production.
App-level `.env.example` files intentionally stay concise and point here to avoid duplication.

## Variable classes (strict separation)

### Server-only variables (API/runtime secret manager only)

- `NHOST_*` server variables, including:
  - `NHOST_ADMIN_SECRET`
  - JWT verification settings (`NHOST_JWKS_URL`, `NHOST_JWT_ISSUER`, `NHOST_JWT_AUDIENCE`)
  - server GraphQL/storage/functions URLs where needed
- `API_ALLOWED_ORIGINS` (API CORS allowlist)
- `YURBRAIN_ALLOWED_ORIGINS` (legacy compatibility alias for `API_ALLOWED_ORIGINS`)
- Operational/test-only API variables (`PORT`, `YURBRAIN_DB_PATH`, `YURBRAIN_TEST_MODE`, etc.)

### Public web variables (browser bundle)

- `NEXT_PUBLIC_NHOST_*`

### Public mobile variables (mobile bundle)

- `EXPO_PUBLIC_NHOST_*`

Never place server-only secrets in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.

## Runtime compatibility and cutover policy (`YURBRAIN_*` -> `NHOST_*`)

Preferred naming:

- `NHOST_*` for server runtime.

Temporary compatibility:

- API and shared Nhost helpers still read legacy aliases such as:
  - `YURBRAIN_NHOST_BACKEND_URL`
  - `YURBRAIN_NHOST_AUTH_URL`
  - `YURBRAIN_NHOST_GRAPHQL_URL`
  - `YURBRAIN_NHOST_STORAGE_URL`
  - `YURBRAIN_NHOST_FUNCTIONS_URL`
  - `YURBRAIN_NHOST_SUBDOMAIN`
  - `YURBRAIN_NHOST_REGION`
  - `YURBRAIN_NHOST_ANON_KEY`
  - `YURBRAIN_NHOST_JWKS_URL`
  - `YURBRAIN_NHOST_JWT_ISSUER`
  - `YURBRAIN_NHOST_JWT_AUDIENCE`
  - `YURBRAIN_NHOST_ADMIN_SECRET`
  - `YURBRAIN_HASURA_GRAPHQL_URL`
  - `YURBRAIN_HASURA_ADMIN_SECRET`

Deprecation guidance:

- Keep legacy keys during cutover only.
- For each environment (local -> preview -> staging -> production), migrate to `NHOST_*` and verify.
- Once all environments are green on `NHOST_*`, remove legacy aliases from runtime and templates.

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
  - `API_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,exp://localhost:8081`
  - optional compatibility alias: `YURBRAIN_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,exp://localhost:8081`
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
- Keep wildcard CORS disabled in all environments; local/dev may allow localhost and Expo origins, but unknown origins should still be rejected rather than reflected as `"*"`.
- Keep `API_ALLOWED_ORIGINS` aligned with actual local web/mobile origins used in testing.

Nhost dashboard settings:

- Auth -> Redirect URLs: localhost web + mobile deep-link callbacks.
- Auth -> Allowed domains/origins: localhost web/mobile origins only.
- Storage buckets present: `avatars`, `capture_assets`, `imports`.
- Storage bucket limits and MIME rules aligned with `docs/nhost/storage.md`.

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

Nhost dashboard settings:

- Auth redirects must point to preview domains/deep links only.
- Auth allowed domains must not include production domains by accident.
- Storage bucket rules should match staging/production baseline.

Secret rotation:

- Rotate preview secrets on schedule and after contributor offboarding.
- Auto-expire preview environments where possible.

### 3) Staging

Nhost:

- Long-lived staging project mirroring production auth/storage/permission settings.

Required vars:

- Same keys as preview/production.
- Keep staging-specific values separate from production in secret manager.

Yurbrain API + client routing:

- Web staging builds must set `YURBRAIN_API_ORIGIN` to the deployed staging API origin so Next.js rewrites proxy `/auth`, `/capture`, `/brain-items`, `/feed`, `/functions`, `/threads`, `/messages`, `/preferences`, `/tasks`, and `/sessions` to the correct backend.
- Mobile staging builds should set `EXPO_PUBLIC_YURBRAIN_API_URL` to the same deployed staging API origin when the app is not using same-host web rewrites.
- Optional `NEXT_PUBLIC_YURBRAIN_API_URL` may be set for browser/client-side direct API calls when same-origin proxying is not used.
- `API_ALLOWED_ORIGINS` must include the staging web origin and any mobile callback/browser origins used during QA.
- `YURBRAIN_ALLOWED_ORIGINS` may be retained temporarily as a compatibility alias, but `API_ALLOWED_ORIGINS` is the canonical key used by CORS hardening.

Redirect URLs:

- Web redirect URLs should use staging domain(s) only.
- Mobile redirect URLs should use staging app deep-link callback targets.

CORS / domains:

- Restrict to staging web domain(s), staging mobile callback hosts, and staging API origin.
- Validate auth redirect allowlist and CORS list together to avoid mismatch.
- Unknown origins must be rejected with a 403 response. Do not use wildcard origins when credentials are enabled.

Nhost dashboard settings:

- Staging redirect/domain allowlists mirror production shape with staging hosts.
- Storage and table permissions match production policy before go-live.

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
  - `NHOST_JWKS_URL`
  - `NHOST_JWT_ISSUER`
  - optional `NHOST_JWT_AUDIENCE` (recommended)
  - `API_ALLOWED_ORIGINS=<comma-separated production origins>`
  - optional compatibility alias: `YURBRAIN_ALLOWED_ORIGINS=<comma-separated production origins>`
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
- Unknown origins must not receive `Access-Control-Allow-Origin: *` when credentials are allowed.

Nhost dashboard settings:

- Auth redirect allowlist exactly matches production web/mobile redirect variables.
- Auth allowed domains include only production domains.
- Storage bucket privacy/MIME/size settings match `docs/nhost/storage.md`.
- Hasura metadata/permissions applied from repository and drift-checked.

Secret rotation:

- Rotate `NHOST_ADMIN_SECRET` and server API tokens on a fixed cadence.
- Rotate immediately after incident, credential leak suspicion, or team access changes.
- Maintain dual-secret rollout playbook (new secret + overlap + revoke old).

## Root `.env.example` vs app-level `.env.example`

- Root `.env.example`: shared/cross-app baseline variables and naming guidance.
- App-level `.env.example`: only app-consumed variables.
- Detailed per-environment values belong in this matrix document (`docs/nhost/environments.md`).

## Required variable reference by surface

### API (server-only, all environments)

Required baseline:

- `NHOST_BACKEND_URL` OR (`NHOST_SUBDOMAIN` + `NHOST_REGION`)
- `NHOST_ANON_KEY`
- `NHOST_ADMIN_SECRET`
- `NHOST_JWKS_URL`
- `NHOST_JWT_ISSUER`
- `API_ALLOWED_ORIGINS`

Recommended:

- `NHOST_JWT_AUDIENCE`
- explicit `NHOST_GRAPHQL_URL`, `NHOST_AUTH_URL`, `NHOST_STORAGE_URL`, `NHOST_FUNCTIONS_URL`
- `YURBRAIN_ALLOWED_ORIGINS` only while legacy env rollout is still in progress

### Web (public vars)

Required baseline:

- `YURBRAIN_API_ORIGIN` for deployed web environments that proxy API routes via Next.js rewrites
- `NEXT_PUBLIC_NHOST_ANON_KEY`
- `NEXT_PUBLIC_NHOST_BACKEND_URL` OR (`NEXT_PUBLIC_NHOST_SUBDOMAIN` + `NEXT_PUBLIC_NHOST_REGION`)
- redirect URLs for sign-in/sign-out/password-reset/email-verification

Optional:

- `NEXT_PUBLIC_YURBRAIN_API_URL` when the browser must call a deployed API origin directly instead of same-origin rewrites

### Mobile (public vars)

Required baseline:

- `EXPO_PUBLIC_YURBRAIN_API_URL` when mobile should call a deployed staging/production API origin directly
- `EXPO_PUBLIC_NHOST_ANON_KEY`
- `EXPO_PUBLIC_NHOST_BACKEND_URL` OR (`EXPO_PUBLIC_NHOST_SUBDOMAIN` + `EXPO_PUBLIC_NHOST_REGION`)
- `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`
- redirect URLs for sign-in/sign-out/password-reset/email-verification

## Related docs

- Local workflow: `docs/dev/nhost-local-setup.md`
- Auth behavior + redirect semantics: `docs/nhost/auth.md`
- Observability and safe error handling: `docs/nhost/observability.md`
- Storage hardening: `docs/nhost/storage.md`
- Permissions model: `docs/nhost/permissions.md`
- Production safety checks and CI gate: `docs/nhost/production-safety-checks.md`
