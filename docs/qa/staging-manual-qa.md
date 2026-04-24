# Staging Manual QA Setup

Use this runbook before executing:

- `docs/qa/web-auth-manual-checklist.md`
- `docs/qa/mobile-auth-manual-checklist.md`
- `docs/qa/capture-manual-checklist.md`

This setup is for a dedicated staging environment where web, mobile, API, and Nhost all point at the same staging stack.

## 1) Required staging URLs and credentials

Prepare these values from your staging deployment and secret manager:

- Staging web URL
- Staging API URL
- Staging Nhost project subdomain/region or explicit service URLs
- Staging anon key
- Staging mobile deep-link callback URL(s)
- Two real test users (User A and User B) with inbox access for verification/reset flows

## 2) Required environment variables by surface

### Web

- `YURBRAIN_API_ORIGIN=<staging-api-origin>`
- `NEXT_PUBLIC_NHOST_ANON_KEY`
- `NEXT_PUBLIC_NHOST_BACKEND_URL` or `NEXT_PUBLIC_NHOST_SUBDOMAIN` + `NEXT_PUBLIC_NHOST_REGION`
- `NEXT_PUBLIC_NHOST_*_REDIRECT_URL`

Notes:

- `YURBRAIN_API_ORIGIN` drives Next.js rewrites to the staging API.
- `NEXT_PUBLIC_YURBRAIN_API_URL` is optional for web; the rewrite path is the primary staging path.

### Mobile

- `EXPO_PUBLIC_YURBRAIN_API_URL=<staging-api-origin>`
- `EXPO_PUBLIC_NHOST_ANON_KEY`
- `EXPO_PUBLIC_NHOST_BACKEND_URL` or `EXPO_PUBLIC_NHOST_SUBDOMAIN` + `EXPO_PUBLIC_NHOST_REGION`
- `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`
- `EXPO_PUBLIC_NHOST_*_REDIRECT_URL`

Notes:

- Mobile now prefers `EXPO_PUBLIC_YURBRAIN_API_URL` when present, so staging builds do not depend on `hostname:3001`.

### API

- `NHOST_*` server variables for the staging project
- `NHOST_ADMIN_SECRET`
- `NHOST_JWKS_URL`
- `NHOST_JWT_ISSUER`
- `API_ALLOWED_ORIGINS=<staging-web-origin,...>`

## 3) Deployment/setup sequence

1. Run repo safety/readiness gates on the release candidate:
   - `pnpm check:secrets`
   - `pnpm check:nhost-safety`
   - `pnpm check:alpha-smoke`
2. Deploy the staging API with staging `NHOST_*` values and `API_ALLOWED_ORIGINS`.
3. Deploy/build the staging web app with `YURBRAIN_API_ORIGIN` and staging `NEXT_PUBLIC_NHOST_*` values.
4. Build/install the staging mobile app with `EXPO_PUBLIC_YURBRAIN_API_URL` and staging `EXPO_PUBLIC_NHOST_*` values.
5. Confirm both web and mobile point to the same staging API and Nhost project before manual QA begins.

## 4) Manual QA execution order

1. `docs/qa/web-auth-manual-checklist.md`
2. `docs/qa/mobile-auth-manual-checklist.md`
3. `docs/qa/capture-manual-checklist.md`
4. Cross-user parity/isolation checks with User A and User B
5. Record outcomes in `docs/nhost/staging-production-smoke-report-template.md`

## 5) Parity expectations

Web and mobile are in parity only if all are true:

- Sign up, sign in, sign out, session restore, password reset, and verification messaging all succeed on both surfaces.
- Capture create/failure behavior matches on both surfaces.
- Both surfaces show the same newly created content for the same user.
- User A cannot see User B data on either surface.

## 6) Common staging blockers

- Web deployed without `YURBRAIN_API_ORIGIN`
- Mobile deployed without `EXPO_PUBLIC_YURBRAIN_API_URL`
- `API_ALLOWED_ORIGINS` missing the staging web origin
- Nhost redirect allowlist missing staging web or mobile callback URLs
- Web and mobile accidentally pointed at different Nhost projects or API origins
