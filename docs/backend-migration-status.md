# Backend Migration Status

This document is the Nhost migration control plane for Yurbrain backend and data access.

## Scope and guardrails

- Product loop protected at all times: capture -> feed -> item detail -> comments/continuation -> plan this -> session -> founder review.
- No big-bang rewrite.
- Web cuts over first, mobile second.
- UI screens must not call REST, GraphQL, or functions directly. UI talks to `packages/client` only.

## Status legend

- `not started`: not implemented for target.
- `in progress`: partially implemented or scaffolded.
- `parity validated`: target behavior validated and safe for production path.
- `legacy retained`: old route kept temporarily for compatibility.
- `deprecate/delete`: planned for removal after parity.

## Capability inventory and classification

| Capability | Current REST/API route(s) | Current source | Target source | Client method (target name) | Product critical | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Current user identity | `GET /auth/me` | `apps/api/src/server.ts` | Nhost Auth session + GraphQL profile read | `getCurrentUser` | Yes | in progress | Web now boots client with Nhost transport + strict identity mode; strict-mode requests require bearer-derived identity and ignore header/query/params/body fallback, and no-session path yields 401. |
| Capture intake pipeline | `POST /capture/intake` | `apps/api/src/routes/capture.ts` | Nhost Function | `createBrainItem` (capture mode) | Yes | not started | Includes enrichment, related detection, feed card side effects, and event append. |
| Brain item list/detail/create/update | `GET /brain-items`, `GET /brain-items/:id`, `POST /brain-items`, `PATCH /brain-items/:id` | `apps/api/src/routes/brain-items.ts` | Hasura GraphQL CRUD | `createBrainItem`, `getBrainItem`, `touchBrainItem` | Yes | in progress | N6 GraphQL path is enabled for list/detail/update; create remains REST-scoped until side-effect parity (feed card/event append) is functionized for safe cutover. |
| Brain item artifacts read | `GET /brain-items/:id/artifacts` | `apps/api/src/routes/brain-items.ts` | Hasura GraphQL read | `getBrainItem` (artifact expansion) | Yes | in progress | Keep writes server-side where feasible. |
| Related item discovery | `GET /brain-items/:id/related` | `apps/api/src/routes/brain-items.ts` | Nhost Function | `getBrainItem` (related context fetch) | Yes | not started | Computed logic, not pure CRUD. |
| Thread create/read | `POST /threads`, `GET /threads/:id`, `GET /threads/by-target` | `apps/api/src/routes/threads.ts` | Hasura GraphQL CRUD/read | `addComment` (thread resolution path) | Yes | in progress | Owner-scoped access required. |
| Message create/list | `POST /messages`, `GET /threads/:id/messages` | `apps/api/src/routes/messages.ts` | Hasura GraphQL CRUD/read | `addComment` | Yes | in progress | Continuation timeline must stay stable. |
| Task create/list/detail/update | `POST /tasks`, `GET /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id` | `apps/api/src/routes/tasks.ts` | Hasura GraphQL CRUD/read | `planThis`, `blockSession` | Yes | in progress | Core for plan/session loop continuity. |
| Manual task convert | `POST /tasks/manual-convert` | `apps/api/src/routes/tasks.ts` | Nhost Function | `planThis` | Yes | not started | Deterministic conversion logic belongs in functions. |
| Session list/detail state | `GET /sessions`, `POST /tasks/:id/start`, `POST /sessions/:id/pause`, `POST /sessions/:id/finish` | `apps/api/src/routes/sessions.ts` | Hasura GraphQL CRUD + function helper where needed | `startSession`, `finishSession`, `blockSession` | Yes | parity validated | Web N7 cutover now uses GraphQL owner-scoped session listing plus function-helper lifecycle endpoints (`/functions/session-helper`) for start/pause/finish parity. |
| User preferences (me) | `GET /preferences/me`, `PUT /preferences/me` | `apps/api/src/routes/preferences.ts` | Hasura GraphQL CRUD | `setFounderMode`, `setDefaultFeedLens` | Yes | parity validated | Web N7 preference path now uses GraphQL wrappers (`get/update preference me`) under Nhost GraphQL transport. |
| User preferences (by userId) | `GET /preferences/:userId`, `PUT /preferences/:userId` | `apps/api/src/routes/preferences.ts` | temporary legacy compatibility | `setFounderMode`, `setDefaultFeedLens` | Yes | legacy retained | Keep until all callers use current-user path. |
| Feed retrieval and ranking | `GET /feed` | `apps/api/src/routes/feed.ts` | Nhost Function | `getFeed` | Yes | parity validated | N8 routes web/domain retrieval to `/functions/feed` (with `/functions/feed/rank` alias) using shared ranking + whyShown shaping in function service. |
| Feed card interaction actions | `POST /feed/:id/dismiss`, `POST /feed/:id/snooze`, `POST /feed/:id/refresh` | `apps/api/src/routes/feed.ts` | Nhost Function or GraphQL mutation wrappers | `getFeed` | Yes | parity validated | N8 routes web/domain feed actions to function endpoints (`/functions/feed/:id/{dismiss|snooze|refresh}`) with owner checks and parity behavior. |
| Legacy AI feed card generator | `POST /ai/feed/generate-card` | `apps/api/src/routes/feed.ts` | deprecate/delete | none | No | deprecate/delete | Prototype helper, remove after feed function parity. |
| Plan-this AI convert | `POST /ai/convert` | `apps/api/src/routes/convert.ts` | Nhost Function | `planThis` | Yes | parity validated | N9 routes plan conversion through `/functions/convert` behind `packages/client`, preserving deterministic outcomes (`task_created`, `plan_suggested`, `not_recommended`). |
| Summarize/classify/query | `POST /ai/summarize`, `POST /ai/classify`, `POST /ai/query` | `apps/api/src/routes/ai.ts` | Nhost Functions | `summarizeProgress`, `getNextStep` | Yes | parity validated | N9 routes thin-slice summarize/classify/query through `/functions/{summarize|classify|query}` with owner-scoped access and deterministic fallback parity. |
| Cluster summary + next step | `POST /ai/summarize-cluster`, `POST /ai/next-step` | `apps/api/src/routes/ai.ts` | Nhost Functions | `summarizeProgress`, `getNextStep` | Yes | parity validated | N9 validates `/functions/summarize-progress` and `/functions/what-should-i-do-next` in strict mode with concise, grounded outputs and graceful non-owner `404` behavior. |
| Founder review | `GET /founder-review` | `apps/api/src/routes/founder-review.ts` | Nhost Function | `getFounderReview` | Yes | parity validated | N10 keeps `/functions/founder-review` as canonical for web/domain/strict-auth validation and retains `/founder-review` only as a compatibility passthrough with explicit deprecation signaling. |
| Founder diagnostics | `GET /functions/founder-review/diagnostics` | `apps/api/src/routes/functions.ts` | Nhost Function | `getFounderDiagnostics` | Yes | parity validated | N10 now returns actionable diagnostics payload (`summary`, item-level `focusItems`, and `focusActions`) and web founder-review integrates the actions through `packages/client` with no transport leakage. |
| Function namespace compatibility | `/functions/*` (feed, summarize, next-step, founder-review, session helper) | `apps/api/src/routes/functions.ts` | temporary legacy compatibility | same domain methods | Yes | legacy retained | Keep only while cutover slices are being validated. |
| Raw events endpoint | `GET /events` (returns 403) | `apps/api/src/server.ts` | deprecate/delete public path | none | Safety critical | parity validated | N11 validates `/events` remains blocked and that client-facing founder diagnostics expose only derived summaries (no raw event payloads). |

## Frontend data-access coupling inventory

| Surface | Current access pattern | Coupling risk | N2 action |
| --- | --- | --- | --- |
| `apps/web` feature controllers | Uses `yurbrainDomainClient` from `@yurbrain/client` for feed/capture/item/session/founder flows | Low runtime coupling, but package exports still allow accidental transport bypass | Migrate imports to explicit stable client entrypoint and tighten exports |
| `apps/mobile` loop controller | Uses `useYurbrainClient` domain methods from `@yurbrain/client` under app-level provider wrapper | Low runtime coupling, bounded by shared client/provider transport policy | Keep shared domain methods, avoid mobile-specific transport fork |
| `packages/client` root exports | Exposes stable client interface, provider, singleton, and `configureApiBaseUrl` only | Reduced risk with explicit boundary | N2 boundary restriction completed |

## Product-critical path protection

The following capabilities are migration-critical and must never regress:

1. Capture intake.
2. Feed retrieval and interaction behavior.
3. Item detail continuity context.
4. Comments/continuation messaging.
5. Plan-this conversion.
6. Session lifecycle.
7. Founder review output and actionability.

## First safe migration slice (recommended)

1. Stabilize `packages/client` with explicit domain interface and transport policy enforcement.
2. Keep runtime behavior REST-backed by default while introducing Nhost and GraphQL/function scaffolds.
3. Migrate web CRUD reads/writes behind stable client methods first.
4. Cut over feed/function logic only after web CRUD parity is proven.

This slice reduces risk because it changes architecture boundaries before changing product behavior.

## N2 progress update

Completed in this repository state:

1. Added stable client interface/factory files:
   - `packages/client/src/createYurbrainClient.ts`
   - `packages/client/src/yurbrainClient.ts`
2. Added provider/hook scaffolding:
   - `packages/client/src/provider.tsx`
   - web/mobile integration points now use the shared package provider/context.
3. Refactored web and mobile controllers to consume injected `YurbrainClient` instance.
4. Kept backend behavior unchanged (REST-backed by default) while adding Nhost transport scaffold.

## Phase closure summary

- N1 (audit + migration tracker): complete.
- N2 (domain client stabilization): complete.
- N3 (Nhost foundation scaffolding): complete.
- N4+ phases remain open and tracked by capability status + cutover checklist.

## N3 progress update

Completed in this repository state:

1. Added a typed Nhost runtime config builder in `packages/client/src/auth/nhost.ts`.
2. Added deterministic env-resolution hooks for testing (`setNhostEnvResolver`).
3. Added derived Nhost URL synthesis from `subdomain + region` for auth/graphql/functions endpoints.
4. Bootstrap now hydrates Hasura GraphQL URL from Nhost runtime config while keeping REST default behavior unchanged.
5. Added Nhost foundation tests:
   - `packages/client/src/__tests__/nhost-runtime-config.test.ts`
   - updated `packages/client/src/__tests__/nhost-auth.test.ts`

## N4 hardening update

Completed in this repository state:

1. Strict-mode requests now enforce bearer-token identity on the API (`x-yurbrain-auth-mode` / `x-yurbrain-identity-mode` => no header/query/params/body fallback).
2. Client strict-mode request path now sends explicit strict-identity mode header and suppresses `x-yurbrain-user-id` injection.
3. Added authenticated Nhost bootstrap test proving session-hydrated `userId` + access token.
4. Added strict-auth core-loop smoke test proving capture -> feed -> item detail -> comments -> plan -> session -> founder review under strict auth mode.

## N5 scaffolding update

Completed in this repository state:

1. Added initial profile + backfill schema scaffold migration (`packages/db/migrations/0010_n5_profiles_backfill_scaffold.sql`) including:
   - `profiles` table with backfill tracking fields.
   - `sessions.user_id` nullable ownership column.
   - ownership indexes to support user-scoped queries.
2. Added `userProfiles` schema + repository APIs in `packages/db/src/schema.ts` and `packages/db/src/index.ts`.
3. Added N5 profile backfill script scaffold (`packages/db/src/scripts/n5-backfill-profiles.ts`) to populate `profiles` from `user_preferences`.
4. Added targeted N5 repository tests for profile/backfill behavior (`packages/db/src/__tests__/n5-profiles.test.ts`).
5. Extended ownership scaffolding hardening:
   - migration now backfills `item_artifacts.user_id`, `item_threads.user_id`, `thread_messages.user_id`, and `sessions.user_id` from existing relational ownership.
   - repository write paths now stamp ownership where available for artifacts/threads/messages/sessions.
6. Added explicit N5 Hasura permission scaffold doc (`docs/nhost-hasura-permission-scaffold.md`) with owner rules, insert presets, stricter artifact/events treatment, and required/optional backfill order.

## N6 progress update

Completed in this repository state:

1. Extended GraphQL CRUD adapter coverage in `packages/client/src/graphql/crud-adapter.ts` for:
   - owner-scoped session listing based on `sessions.user_id`.
2. Kept `createBrainItem` on REST path to preserve loop-critical side effects (feed-card generation + event append) until N7/N8 function parity slice is validated.
3. Added targeted N6 client tests proving:
   - GraphQL list/detail/update brain-item and threads/tasks/preferences wrappers route in GraphQL mode.
   - GraphQL session list path queries by owner-scoped `sessions.user_id`.

## N7 completion update

N7 is complete in this repository state:

1. Web continues to consume only `YurbrainClient` methods; no UI transport leakage introduced.
2. Web CRUD/list/detail paths now run through GraphQL-backed domain wrappers where parity is safe:
   - brain item list/detail/update (create remains intentionally REST-scoped).
   - threads/messages CRUD.
   - tasks/session list (owner-scoped GraphQL).
   - preferences me/read-update flows.
3. Session lifecycle start/pause/finish is now function-helper backed in GraphQL mode (`/functions/session-helper`), removing legacy REST coupling on migrated web path.
4. N7 checklist/runbook/baseline docs are aligned to prevent staleness and to preserve explicit guardrails for loop-sensitive create and computed flows.

## N8 completion update

N8 is complete in this repository state:

1. `packages/client` now routes feed retrieval and feed actions to function endpoints in Nhost mode:
   - `GET /functions/feed` (canonical) and compatibility alias `/functions/feed/rank`.
   - `POST /functions/feed/:id/{dismiss|snooze|refresh}` for re-entry interactions.
2. Function-backed synthesis/founder computed routes are wired for migrated web/domain methods:
   - `POST /functions/summarize-progress`
   - `POST /functions/what-should-i-do-next` (with `/functions/next-step` alias)
   - `GET /functions/founder-review`
3. N8 parity tests verify:
   - function feed route and alias consistency,
   - strict-auth feed ranking/whyShown continuity quality,
   - owner-scoped feed action behavior,
   - strict-auth core-loop regression safety.

## N9 completion update

N9 is complete in this repository state:

1. `packages/client` now routes thin-slice AI methods to function endpoints:
   - `POST /functions/summarize-progress`
   - `POST /functions/what-should-i-do-next`
   - `POST /functions/summarize`
   - `POST /functions/classify`
   - `POST /functions/query`
   - `POST /functions/convert`
2. Function route ownership handling for synthesis endpoints is now graceful (non-owner access returns `404` instead of bubbling uncaught errors).
3. N9 parity tests validate strict-auth quality/grounding and fallback behavior across summarize/classify/query/convert while keeping core-loop regression checks green.

## N10 kickoff update

N10 begins in this repository state with founder-review completion scope:

1. Consolidate founder-review web/domain usage on canonical function APIs and trim compatibility debt.
2. Preserve concise founder readouts and diagnostics quality while tightening owner-scoped access guarantees.
3. Capture parity evidence for founder review actionability before legacy founder routes are considered for deprecation.

## N10 completion update

N10 is complete in this repository state:

1. Founder-review diagnostics now provide actionable contract-backed payloads (`generatedAt`, `window`, aggregate `summary`, item-level `focusItems`, and feed-level `focusActions`) through canonical `GET /functions/founder-review/diagnostics`.
2. Web Founder Review now consumes diagnostics through `packages/client` (`getFounderDiagnostics`) and exposes actionable follow-up flows from the diagnostics surface without transport calls in UI code.
3. Strict-auth core-loop validation remains anchored to canonical `GET /functions/founder-review`, and legacy `/founder-review` is retained only as explicit compatibility/deprecation route.

## N11 kickoff update

N11 begins in this repository state with event-safety scope:

1. Re-verify that raw event data remains inaccessible from public client routes and stays server-only/tightly restricted.
2. Audit function and GraphQL pathways for inadvertent event payload leakage into UI-facing contracts.
3. Document final keep/remove decisions for any event-adjacent compatibility routes before N12 mobile cutover.

## N11 completion update

N11 is complete in this repository state:

1. Event write payloads are now explicitly allowlisted and normalized by event type (`brain_item_created`, `brain_item_updated`) in API service logic before persistence.
2. Raw event endpoint remains blocked (`GET /events` => `403`), and founder diagnostics continue exposing only derived data (`summary`, `focusItems`, `focusActions`) with no raw event payload pass-through.
3. Expanded N11 tests validate event access policy, owner-scoped write behavior, and that legacy body `userId` spoofing cannot redirect event ownership on capture or brain-item creation routes.

## N12 kickoff update

N12 begins in this repository state with mobile cutover scope:

1. Align mobile bootstrap with authenticated shared client initialization, mirroring web transport boundary rules.
2. Validate mobile capture/feed/item/session/founder flows continue using `packages/client` domain methods only (no transport forks).
3. Capture mobile parity evidence against the validated continuity loop before any legacy route cleanup in N13.

## N12 completion update

N12 is complete in this repository state:

1. Mobile app provider wiring now explicitly selects Nhost transport via the local provider wrapper (`options={{ transport: "nhost" }}`), aligning bootstrap behavior with web.
2. Mobile root app now imports and uses the local provider wrapper, keeping transport policy explicit instead of implicitly relying on package defaults.
3. Mobile loop flow remains routed through shared `packages/client` domain methods (`getFeed`, `createCaptureIntake`, `getItemContext`, `planThis`, `startSession`/`blockSession`/`finishSession`, founder preference patching) with no direct GraphQL/function calls in mobile surfaces.
4. Added targeted mobile guard tests to prevent transport-boundary regression (`apps/mobile/src/__tests__/n12-mobile-cutover.test.ts`).

## N13 kickoff update

N13 begins in this repository state with legacy cleanup scope:

1. Inventory remaining REST and compatibility handlers still exercised by domain methods after N12 parity completion.
2. Prioritize cleanup candidates that are already parity-validated across both web and mobile while preserving strict-auth safety gates.
3. Keep public raw-event access blocked and retain loop-safety regression checks during each cleanup slice.
## Unclassified capabilities

None in current scope. Every meaningful route/capability is classified above.

## Route replacement map

- CRUD to GraphQL: brain items, item artifacts reads, threads/messages, tasks, sessions, preferences/profile.
- Computed logic to Functions: capture pipeline, feed shaping, summarize progress, next step, plan conversion, founder review, diagnostics.
- Temporary legacy: `/functions/*` compatibility routes and `/preferences/:userId`.
- Delete: legacy feed generator and public `/events` endpoint.
