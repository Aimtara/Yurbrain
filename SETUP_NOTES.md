# Nhost integration setup notes

This repository already contained partial Nhost migration scaffolding in `packages/client` and docs.
The implementation here adds a dedicated `@yurbrain/nhost` package and app-local client wrappers without changing the existing shared domain client transport flow.

## Ambiguities and least-risk choices

1. Existing env conventions in this repo include both:
   - generic keys (`NHOST_*`)
   - Yurbrain-prefixed keys (`YURBRAIN_NHOST_*`, `YURBRAIN_HASURA_*`)
   So server helpers support both, but browser/mobile wrappers require explicit public keys (`NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`) only.

2. Existing docs and code referenced `functions` URLs even when not explicitly required in all paths.
   The new shared package resolves and exposes functions/storage/graphql/auth URLs from either explicit URLs or backend/subdomain+region inputs, but does not force usage where existing code does not require it.

3. Existing shared client package (`@yurbrain/client`) already initializes Nhost bootstrap.
   To avoid risk, this integration does not replace that flow; it adds app-local Nhost client setup and reusable env validation helpers in `@yurbrain/nhost`.

## Security guardrails in this change

- No admin secret is read from public env keys.
- Server admin access is isolated to `apps/api/src/services/nhost/admin.ts`.
- Client wrappers (`apps/web`, `apps/mobile`) require anon key + public addressing vars and never access `NHOST_ADMIN_SECRET`.

## Required manual steps (Nhost + deployment)

1. In the Nhost dashboard (or project config), collect:
   - subdomain + region or full service URLs
   - anon key
   - admin secret (server only)
2. Configure app envs from the new examples:
   - `apps/web/.env.example` -> `.env.local`
   - `apps/mobile/.env.example` -> `.env`
   - `apps/api/.env.example` -> runtime/server env source
3. Ensure deployment secrets are scoped correctly:
   - web/mobile only get `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`
   - api gets `NHOST_ADMIN_SECRET` (and optional server `NHOST_*` URLs)
4. Rotate any previously exposed admin secret if it was ever placed in client/public env vars.

## Auth hardening notes (web + mobile)

The Nhost client integration now includes minimal production-safe auth flow scaffolding:

- sign up
- sign in (password)
- sign out
- password reset email
- email verification email (resend)
- explicit session refresh/restore checks
- auth loading/error state helpers
- protected-surface fallback when no valid session exists

### Redirect URL strategy

Do not hardcode per-environment URLs in source code. Use env keys:

- Web:
  - `NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL`
  - `NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL`
  - `NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL`
  - `NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL`
- Mobile:
  - `EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL`
  - `EXPO_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL`
  - `EXPO_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL`
  - `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`

If unset, runtime origin/deep-link defaults are used as safe local fallbacks.

### Nhost dashboard configuration required

In Nhost Auth settings:

1. Enable email/password provider.
2. Configure email verification behavior to require verification if desired for production.
3. Configure password reset email template and URL behavior.
4. Add allowed redirect URLs for each environment:
   - local web (`http://localhost:3000`)
   - local mobile callback/deep-link URI (for example `exp://127.0.0.1:19000` or your app scheme)
   - staging web/mobile callback URIs
   - production web/mobile callback URIs
5. Keep admin credentials server-only; never expose admin secret in web/mobile envs.

### Production redirect URL guidance

Do not hardcode local/staging/prod callback URLs in code.
Set environment variables per deployment target:

- web: `NEXT_PUBLIC_NHOST_*_REDIRECT_URL`
- mobile: `EXPO_PUBLIC_NHOST_*_REDIRECT_URL`
- server docs/ops reference: `NHOST_AUTH_REDIRECT_SIGN_IN_URL`, `NHOST_AUTH_REDIRECT_SIGN_OUT_URL`, `NHOST_AUTH_REDIRECT_PASSWORD_RESET_URL`, `NHOST_AUTH_REDIRECT_EMAIL_VERIFICATION_URL`

These should match the exact values allowed in the Nhost dashboard auth settings.
