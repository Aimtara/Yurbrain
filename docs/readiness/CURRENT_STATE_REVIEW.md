# Yurbrain Current State Review

_Last updated: 2026-04-26._

## Summary

Fresh repository audit confirms Yurbrain is a strong MVP / pre-production alpha hardening codebase. The current codebase already includes a continuity-first core loop, strict bearer identity support, CORS hardening, route-class rate limiting, local authz/two-user isolation tests, storage metadata scaffolding, and a passing CI safety workflow for the audited commit.

This review is a current-state source of truth. It records local and CI evidence only; it is not staging or production proof.

## Current production classification

**Yellow: staging hardening.** Production remains **NO-GO** until staging evidence, storage launch decision signoff, operational drills, and final production gate evidence are complete.

## 1. Current git branch

- Audit branch at start: `main`
- Implementation branch for this readiness hardening work: `cursor/production-readiness-20260426`

## 2. Current release candidate commit SHA

- Audited release candidate/base commit: `8ae8d635e3fadf63fa0c78e98d1023b04446e622`
- Recent CI evidence: GitHub Actions `Nhost Production Safety` run `24948043688` succeeded for the same commit on 2026-04-26.

## 3. Whether working tree is clean

- Start-of-audit status: clean, `main...origin/main`
- After local verification: clean before documentation implementation began.

## 4. Package/app inventory

| Workspace | Role | Production impact |
| --- | --- | --- |
| `apps/api` | Fastify API on port 3001, PGlite repository, auth/CORS/rate-limit middleware, core loop routes | Primary production backend |
| `apps/web` | Next.js 15 web app, Focus Feed home, Brain Item Detail, capture, comments, AI fallback, tasks/sessions, Explore | Primary launch surface |
| `apps/mobile` | Expo/React Native preview app with Nhost auth and core loop surfaces | Preview/deferred unless smoke-tested |
| `@yurbrain/contracts` | Zod domain and API schemas | Shared contract authority |
| `@yurbrain/client` | API/GraphQL client helpers and React hooks | Web/mobile integration |
| `@yurbrain/db` | PGlite/Drizzle schema and repository | Core persistence |
| `@yurbrain/ai` | Deterministic AI fallback/context/validation helpers | Bounded optional AI behavior |
| `@yurbrain/nhost` | Nhost config/client helper package | Auth/Nhost integration |
| `@yurbrain/ui` | Shared React UI components | UX consistency |
| `functions/aiRunner.ts` | Legacy/serverless function stub wrapping deterministic AI/ranking behavior | Compatibility/migration scaffold |
| `nhost/*` | Nhost config and Hasura metadata scaffolding | Staging/production migration support |

## 5. Scripts inventory by package

### Root

Required scripts exist:

- `test`
- `lint`
- `typecheck`
- `build`
- `check:security`
- `check:authz-smoke`
- `check:storage-smoke`
- `check:ops-smoke`
- `check:production-safety`
- `test:e2e`

Current root composite:

- `check:production-safety` runs security, authz smoke, storage smoke, ops smoke, and alpha smoke.

### Apps/packages

| Package | Important scripts | Current caveat |
| --- | --- | --- |
| `api` | `dev`, `start`, `typecheck`, `lint`, `test` | `pnpm dev:api` uses the package script, but cloud guidance prefers direct `tsx --watch` if needed. |
| `web` | `dev`, `build`, `typecheck`, `lint`, `test` | `test` was a placeholder at audit time and must become meaningful production evidence. |
| `mobile` | `dev`, `start`, `typecheck`, `lint`, `test`, `build` | `build` is an explicit deferred no-op until mobile enters launch scope. |
| `@yurbrain/contracts` | `test`, `typecheck`, `lint`, `build` | Build is source-consumed no-op. |
| `@yurbrain/client` | `test`, `typecheck`, `lint`, `build` | Build is source-consumed no-op. |
| `@yurbrain/db` | `db:*`, `test`, `typecheck`, `lint`, `build` | Build is source-consumed no-op. |
| `@yurbrain/ai` | `dev`, `start`, `test`, `typecheck`, `lint`, `build` | Build is source-consumed no-op. |
| `@yurbrain/nhost` | `dev`, `start`, `test`, `typecheck`, `lint`, `build` | `test` is currently a documented coverage no-op; needs explicit approval or a real focused test. |
| `@yurbrain/ui` | `dev`, `start`, `test`, `typecheck`, `lint`, `build` | Build is source-consumed no-op. |

## 6. Routes inventory

### Health, auth, disabled raw events

- `GET /health/live`
- `GET /health/ready`
- `GET /auth/me`
- `GET /events` — disabled with 403 until authenticated scoped event reads exist.

### Capture and Brain Items

- `POST /capture/intake`
- `POST /brain-items`
- `GET /brain-items`
- `GET /brain-items/:id`
- `PATCH /brain-items/:id`
- `GET /brain-items/:id/artifacts`
- `GET /brain-items/:id/related`

### Threads and messages

- `POST /threads`
- `GET /threads/:id`
- `GET /threads/by-target`
- `POST /messages`
- `GET /threads/:id/messages`

### Preferences

- `GET /preferences/me` — canonical.
- `PUT /preferences/me` — canonical.
- `GET /preferences/:userId` — legacy compatibility, owner-scoped to current bearer user.
- `PUT /preferences/:userId` — legacy compatibility, owner-scoped to current bearer user.

### Feed

- `GET /feed`
- `POST /feed/:id/dismiss`
- `POST /feed/:id/snooze`
- `POST /feed/:id/remind-later`
- `POST /feed/:id/refresh`
- `POST /functions/feed/generate-card`

### Tasks and sessions

- `POST /tasks/manual-convert`
- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `GET /sessions`
- `POST /tasks/:id/start`
- `POST /sessions/:id/pause`
- `POST /sessions/:id/finish`

### AI/function compatibility

- `POST /ai/brain-items/:id/summarize`
- `POST /ai/brain-items/:id/classify`
- `POST /ai/brain-items/:id/query`
- `POST /ai/convert`
- `GET /functions/feed`
- `POST /functions/feed/:id/dismiss`
- `POST /functions/feed/:id/snooze`
- `POST /functions/feed/:id/refresh`
- `POST /functions/summarize`
- `POST /functions/classify`
- `POST /functions/query`
- `POST /functions/convert`
- `POST /functions/summarize-progress`
- `POST /functions/what-should-i-do-next`
- `GET /functions/founder-review`
- `GET /functions/founder-review/diagnostics`
- `POST /functions/session-helper`

### Explore

- `POST /explore/connections/preview`
- `POST /explore/connections/save`

## 7. Auth mode inventory

| Mode/source | Current behavior | Production decision |
| --- | --- | --- |
| Verified bearer token | Resolves current user through JWT verification. Test mode uses HS256 helper; production-like mode uses Nhost issuer/JWKS and optional audience. | Required for staging/production protected routes. |
| `x-yurbrain-auth-mode: strict` | Forces strict bearer identity for the request. | Required in staging smoke templates. |
| `x-yurbrain-identity-mode: strict` | Also forces strict bearer identity. | Supported compatibility/header alias. |
| `YURBRAIN_IDENTITY_MODE=strict` or production-like env | Makes strict identity the default. | Required for staging/production. |
| `x-yurbrain-user-id` | Accepted only in local/test non-strict compatibility mode. Rejected/ignored in strict and production-like modes. | Not a production identity source. |
| `body.userId`, `query.userId`, path `userId` | Still accepted by some schemas/routes for compatibility, but server routes derive ownership from `currentUser.id`. | Compatibility-only; not authoritative. |

Required strict behavior is local-tested for missing token, invalid token, fallback denial, spoofed header/query/body user IDs, valid bearer identity, and high-value cross-user denials. Staging proof with real Nhost tokens remains missing.

## 8. Storage feature inventory

| Feature | Current state | Production status |
| --- | --- | --- |
| Attachment metadata schema | Present in DB (`attachments`) with owner, item, bucket/object key, MIME/size/status metadata. | Metadata only. |
| Nhost attachment permissions | Hasura metadata scaffolding exists. | Needs staging proof if used. |
| Upload/read/list/delete object lifecycle | No production API/client lifecycle route is proven. | Deferred. |
| UI native upload affordances | Web/mobile copy and tests mark upload/file capture as post-alpha or hide image mode unless enabled. | Safe to defer for web-first launch. |
| Storage smoke | Local metadata + backup/restore smoke exists. | Not object lifecycle proof. |

Launch decision: **storage object lifecycle is deferred for web-first production** unless all upload/read/list/delete/two-user proof is implemented later.

## 9. Current known local verification status

Local verification evidence recorded for this audit:

```bash
pnpm check:production-safety && pnpm test:e2e
```

Result: passed with exit 0.

E2E final section:

```text
full loop: capture -> feed -> comment/query -> convert -> act
pass 1
fail 0
```

This is **local** verification evidence only.

## 10. Current known staging status

**Not evidenced.** No completed staging API smoke, staging strict JWT/CORS validation, two-user isolation smoke, web smoke, alert test, rollback rehearsal, or managed backup/restore drill is recorded for this release candidate.

## 11. Current known production status

**NO-GO.** Production has no approved gate because staging signoff, ops drills, storage launch decision signoff, support/on-call proof, and production preflight evidence are incomplete.

## 12. Existing docs that conflict with code

| Doc/source | Conflict | Current-code truth |
| --- | --- | --- |
| `docs/dev/runbook.md` | Mentions `GET/PUT /preferences/:userId` as the preference persistence route. | `/preferences/me` is canonical; `/:userId` is legacy compatibility and owner-scoped. |
| `docs/security/RATE_LIMITING.md` | Uses stale env names such as `YURBRAIN_RATE_LIMIT_ENABLED` / `_MAX`. | Code uses `YURBRAIN_RATE_LIMIT_DISABLED`, `YURBRAIN_RATE_LIMIT_WINDOW_MS`, and `YURBRAIN_RATE_LIMIT_<CLASS>_LIMIT`. |
| Nhost storage examples | Show upload/delete patterns. | App storage object lifecycle remains deferred unless separately implemented and smoke-tested. |
| `apps/web` test script | Says no standalone automated tests yet. | This should not count as production evidence; a meaningful web smoke test is required. |
| Mobile build script | Explicit deferred no-op. | Acceptable only while mobile is out of launch scope and documented. |

## 13. Naming discrepancies between assessment and code

| Assessment language | Current codebase convention |
| --- | --- |
| `completed` | Task status is `done`; session terminal state is `finished`. |
| `ready` | Task initial status is `todo`. |
| Canonical `/ai/*` or `/feed/*` vs legacy `/functions/*` | Code supports both app routes and legacy `/functions/*` compatibility routes. |
| `userId` request fields as ownership | Code derives ownership from `currentUser.id`; request fields are compatibility-only. |
| `preferences/:userId` | Canonical route is `/preferences/me`; path route remains compatibility. |
| `diagnostics` | Current code uses `founder-review` and `founder-review/diagnostics`. |
| `Explore saved connection` | Stored as `connection` artifact/feed card content. |
| `feed_expensive` rate-limit class | Current class name is `feed`. |

## 14. Decision on which naming/convention to follow

Follow current production-aligned code conventions and add documentation/compatibility layers instead of renaming working systems. Security ownership conventions override compatibility: caller-supplied user IDs are not authoritative in strict/staging/production.

## 15. Existing functionality that must not be rolled back

- Focus Feed as home/default surface.
- Low-friction capture flow.
- Brain Item Detail as continuity surface.
- Comments and item chat.
- Optional grounded/fallback AI.
- Downstream task conversion and session lifecycle.
- Explore preview/save as optional source-linked connection mode.
- Legacy `/functions/*` routes while clients may still use them.
- Local/test header identity fallback for existing tests, as long as it remains impossible in strict/production-like mode.
- Storage metadata scaffolding, while avoiding unsupported object lifecycle claims.

## 16. P0 blockers

- Missing current-state and naming/compatibility source-of-truth docs.
- Staging strict JWT/CORS/two-user/web smoke evidence absent.
- Web test script is not meaningful production evidence.
- `/preferences/:userId` needs explicit deprecation/compatibility treatment.
- Strict auth policy doc missing.
- Rate-limit docs do not match code env names.
- Storage launch decision must be explicit.
- Mobile launch scope must be explicit.

## 17. P1 blockers

- CI should run full local parity (`check:ops-smoke`, `check:production-safety`, and possibly `test:e2e` if stable).
- `@yurbrain/nhost` test no-op needs approval or a real small test.
- Operational drills are documented but not exercised in staging.
- Backup/restore proof is local only; staging restore drill is missing.
- Support/on-call ownership requires final launch assignment.
- Data lifecycle/account deletion hard-delete/cascade policies are pending.

## 18. Recommended next implementation sequence

1. Commit this current-state review and associated readiness/naming documentation.
2. Add naming and compatibility decisions.
3. Add strict auth policy and preference route deprecation/safety tests.
4. Replace the web test placeholder with a meaningful automated smoke.
5. Reconcile rate-limit docs with code.
6. Create storage launch decision and mobile launch-scope docs.
7. Bring CI closer to production-safety parity.
8. Run targeted auth/web/docs tests, then root safety gates.
9. Prepare staging smoke packet and keep production gate NO-GO until real staging evidence exists.

