# Mobile launch scope

Last updated: 2026-04-30

## Decision

Mobile is **preview/deferred for production launch**.

Yurbrain’s production launch surface is web-first until mobile has its own staging evidence packet.

## Current repo state

- `apps/mobile` exists as an Expo app and shares client/UI packages.
- The mobile package has tests and typecheck scripts.
- The package `build` script intentionally states: `mobile production build is deferred; run Expo build only when mobile enters launch scope`.
- Mobile Nhost auth/session code exists, but there is no checked-in production mobile smoke packet proving install, auth, capture, feed, detail, AI fallback, session lifecycle, logout/session restore, and push/platform behavior.

## Production policy

For the next production gate:

- Do not market mobile as a production-supported surface.
- Do not require mobile for first launch.
- Treat mobile as preview/internal unless a separate launch decision is approved.
- Keep mobile changes compatible with shared contracts and client adapters.

## Evidence required to move mobile into scope

1. Expo production build or equivalent artifact produced from the release candidate.
2. Install smoke on target iOS/Android devices or simulators.
3. Real Nhost auth smoke:
   - sign up/sign in,
   - email verification path,
   - session restore,
   - logout.
4. Core loop smoke:
   - capture,
   - Focus feed,
   - item detail,
   - comment,
   - AI fallback/query,
   - Plan This,
   - task/session lifecycle.
5. Two-user isolation smoke using mobile client paths.
6. Crash/error monitoring verified for mobile.
7. Human signoff that mobile support/on-call is staffed.

Until this evidence exists, production remains web-first and mobile preview/deferred.
