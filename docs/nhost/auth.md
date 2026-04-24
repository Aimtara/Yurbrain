# Nhost Auth Production Hardening

This document defines the auth behavior and configuration for Yurbrain web/mobile clients using Nhost.

## Scope

- Web: `apps/web/src/nhost/useNhostAuth.ts`
- Mobile: `apps/mobile/src/nhost/useNhostAuth.ts`
- Shared runtime config: `packages/nhost/src/client.ts`
- Mobile token persistence: `apps/mobile/src/nhost/storage.ts`

## Supported flows

The auth hooks expose the following actions:

- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`
- `requestPasswordReset(email)`
- `sendVerificationEmail()`
- `refreshSession()` (uses `nhost.refreshSession()` from the root client)
- `getSession()`

Each hook also exposes:

- `loading`
- `error`
- `clearAuthError()` (web)
- `clearError()` (mobile)
- `isAuthenticated`
- `session`

## Session restore

### Web

- Session restore is delegated to the Nhost auth client.
- `useNhostAuth` performs initial `nhost.refreshSession()` and explicit session reads.

### Mobile

- Session persistence uses AsyncStorage-backed session storage.
- `hydrateMobileNhostSessionStorage()` is called explicitly before protected screens are evaluated.
- `useNhostAuth` waits for hydration and then performs explicit `nhost.refreshSession()` + session reads.

## Protected route/screen behavior

Minimal guard behavior is implemented in root app surfaces:

- Web (`apps/web/app/page.tsx`):
  - Shows loading state while auth state resolves.
  - Shows "Sign in required" state when session is absent.
  - Existing app surface remains unchanged when authenticated.

- Mobile (`apps/mobile/src/App.tsx`):
  - Shows loading/auth required states before rendering app surfaces.
  - Existing app shell renders only when authenticated.

## Redirect URL strategy (no hardcoded env-specific URLs)

Redirect URLs are resolved in this order:

1. Explicit env vars (`*_NHOST_*_REDIRECT_URL` keys).
2. Runtime origin fallback (`window.location.origin`) on web.
3. Mobile fallback from `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`.
4. Last-resort local defaults when no better value exists.

Recommended env keys:

- Web:
  - `NEXT_PUBLIC_NHOST_APP_ORIGIN` (optional explicit origin override)
  - `NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL`
  - `NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL`
  - `NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL` (optional)
  - `NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL` (optional)

- Mobile:
  - `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`
  - `EXPO_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL`
  - `EXPO_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL`
  - `EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL` (optional)
  - `EXPO_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL` (optional)

## Nhost dashboard settings required

In Nhost Auth settings:

1. Enable email/password authentication.
2. Configure allowed redirect URLs for:
   - local web (for example `http://localhost:3000`)
   - local mobile deep links (for example `exp://...` or app scheme)
   - staging origin(s)
   - production origin(s)
3. Configure email template links for:
   - email verification
   - password reset
4. Ensure JWT claims include:
   - `x-hasura-user-id`
   - `x-hasura-role`
   - `x-hasura-allowed-roles`

## Security notes

- Never expose `NHOST_ADMIN_SECRET` or service credentials to client apps.
- Client apps must use only public env prefixes (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`).
- Server-only privileged operations stay in API/server paths.
