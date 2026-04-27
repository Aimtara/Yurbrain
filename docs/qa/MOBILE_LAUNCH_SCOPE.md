# Mobile Launch Scope

_Status: preview/deferred for first web production launch._

## Decision

Yurbrain's first production launch scope is **web-first**. The Expo mobile app is a preview surface until mobile-specific staging smoke evidence, auth/session behavior, and storage-scope decisions are recorded.

## Current implementation

- Mobile app exists under `apps/mobile`.
- It supports Nhost session persistence with AsyncStorage.
- It uses the shared Yurbrain client and continuity surfaces for capture, Focus Feed, item detail, tasks/sessions, Explore, and Me.
- Mobile tests and typecheck/lint scripts exist.
- `apps/mobile` production `build` is an explicit deferred no-op:
  - `mobile production build is deferred; run Expo build only when mobile enters launch scope`
- Native image/file capture is hidden unless `EXPO_PUBLIC_YURBRAIN_STORAGE_ENABLED=true`.

## Launch-scope rule

Mobile may enter production launch scope only after:

1. Expo build or equivalent CI-buildable verification is added.
2. Mobile staging smoke passes on a release candidate.
3. Auth/session restore and logout are verified.
4. Capture → feed → detail → comment/AI → task/session flow is verified.
5. Storage behavior is verified if `EXPO_PUBLIC_YURBRAIN_STORAGE_ENABLED=true`; otherwise storage remains visibly deferred.
6. Support/on-call is ready to triage mobile-specific issues.

## Required mobile staging smoke

| Check | Required result | Status |
| --- | --- | --- |
| App launches from release build | App opens without development server dependency | Pending |
| Login/session restore | Valid staging session restores after app restart | Pending |
| Logout/session expiry | Protected calls fail safely after logout/expired session | Pending |
| Capture text/link | Capture creates BrainItem and Focus card | Pending |
| Focus Feed | Cards load for current user only | Pending |
| Brain Item Detail | Item opens with original context | Pending |
| Comments | User can add continuation comment | Pending |
| Ask Yurbrain/fallback | Grounded response or safe fallback appears | Pending |
| Task conversion/session | Plan/create task/start/pause/finish works | Pending |
| Explore | Preview/save works if enabled | Pending |
| Storage | Deferred unless explicitly enabled and smoke-tested | Deferred |

## Production statement

Until the above evidence is recorded, mobile must be described as **preview/deferred**, not production-ready.
