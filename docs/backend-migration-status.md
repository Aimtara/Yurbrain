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
| Current user identity | `GET /auth/me` | `apps/api/src/server.ts` | Nhost Auth session + GraphQL profile read | `getCurrentUser` | Yes | not started | Remove demo identity assumptions and header fallback reliance from user paths. |
| Capture intake pipeline | `POST /capture/intake` | `apps/api/src/routes/capture.ts` | Nhost Function | `createBrainItem` (capture mode) | Yes | not started | Includes enrichment, related detection, feed card side effects, and event append. |
| Brain item list/detail/create/update | `GET /brain-items`, `GET /brain-items/:id`, `POST /brain-items`, `PATCH /brain-items/:id` | `apps/api/src/routes/brain-items.ts` | Hasura GraphQL CRUD | `createBrainItem`, `getBrainItem`, `touchBrainItem` | Yes | in progress | N2 stable client surface now includes these methods; runtime behavior remains parity-preserving. |
| Brain item artifacts read | `GET /brain-items/:id/artifacts` | `apps/api/src/routes/brain-items.ts` | Hasura GraphQL read | `getBrainItem` (artifact expansion) | Yes | in progress | Keep writes server-side where feasible. |
| Related item discovery | `GET /brain-items/:id/related` | `apps/api/src/routes/brain-items.ts` | Nhost Function | `getBrainItem` (related context fetch) | Yes | not started | Computed logic, not pure CRUD. |
| Thread create/read | `POST /threads`, `GET /threads/:id`, `GET /threads/by-target` | `apps/api/src/routes/threads.ts` | Hasura GraphQL CRUD/read | `addComment` (thread resolution path) | Yes | in progress | Owner-scoped access required. |
| Message create/list | `POST /messages`, `GET /threads/:id/messages` | `apps/api/src/routes/messages.ts` | Hasura GraphQL CRUD/read | `addComment` | Yes | in progress | Continuation timeline must stay stable. |
| Task create/list/detail/update | `POST /tasks`, `GET /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id` | `apps/api/src/routes/tasks.ts` | Hasura GraphQL CRUD/read | `planThis`, `blockSession` | Yes | in progress | Core for plan/session loop continuity. |
| Manual task convert | `POST /tasks/manual-convert` | `apps/api/src/routes/tasks.ts` | Nhost Function | `planThis` | Yes | not started | Deterministic conversion logic belongs in functions. |
| Session list/detail state | `GET /sessions`, `POST /tasks/:id/start`, `POST /sessions/:id/pause`, `POST /sessions/:id/finish` | `apps/api/src/routes/sessions.ts` | Hasura GraphQL CRUD + function helper where needed | `startSession`, `finishSession`, `blockSession` | Yes | in progress | Start/pause/finish may remain function-backed if orchestration grows. |
| User preferences (me) | `GET /preferences/me`, `PUT /preferences/me` | `apps/api/src/routes/preferences.ts` | Hasura GraphQL CRUD | `setFounderMode`, `setDefaultFeedLens` | Yes | in progress | N2 introduces explicit domain methods for these preference updates. |
| User preferences (by userId) | `GET /preferences/:userId`, `PUT /preferences/:userId` | `apps/api/src/routes/preferences.ts` | temporary legacy compatibility | `setFounderMode`, `setDefaultFeedLens` | Yes | legacy retained | Keep until all callers use current-user path. |
| Feed retrieval and ranking | `GET /feed` | `apps/api/src/routes/feed.ts` | Nhost Function | `getFeed` | Yes | not started | Deterministic ranking + whyShown must preserve product feel. |
| Feed card interaction actions | `POST /feed/:id/dismiss`, `POST /feed/:id/snooze`, `POST /feed/:id/refresh` | `apps/api/src/routes/feed.ts` | Nhost Function or GraphQL mutation wrappers | `getFeed` | Yes | not started | Keep behavior parity with current loop re-entry ergonomics. |
| Legacy AI feed card generator | `POST /ai/feed/generate-card` | `apps/api/src/routes/feed.ts` | deprecate/delete | none | No | deprecate/delete | Prototype helper, remove after feed function parity. |
| Plan-this AI convert | `POST /ai/convert` | `apps/api/src/routes/convert.ts` | Nhost Function | `planThis` | Yes | not started | Keep deterministic fallback behavior. |
| Summarize/classify/query | `POST /ai/summarize`, `POST /ai/classify`, `POST /ai/query` | `apps/api/src/routes/ai.ts` | Nhost Functions | `summarizeProgress`, `getNextStep` | Yes | not started | Thin-slice AI only; no generic chat expansion. |
| Cluster summary + next step | `POST /ai/summarize-cluster`, `POST /ai/next-step` | `apps/api/src/routes/ai.ts` | Nhost Functions | `summarizeProgress`, `getNextStep` | Yes | not started | Product-aligned concise output required. |
| Founder review | `GET /founder-review` | `apps/api/src/routes/founder-review.ts` | Nhost Function | `getFounderReview` | Yes | not started | Derived summary/scoring only; avoid raw event leakage. |
| Founder diagnostics | `GET /functions/founder-review/diagnostics` | `apps/api/src/routes/functions.ts` | Nhost Function | `getFounderDiagnostics` | Yes | not started | Return affected-item diagnostics, not broad analytics dashboards. |
| Function namespace compatibility | `/functions/*` (feed, summarize, next-step, founder-review, session helper) | `apps/api/src/routes/functions.ts` | temporary legacy compatibility | same domain methods | Yes | legacy retained | Keep only while cutover slices are being validated. |
| Raw events endpoint | `GET /events` (returns 403) | `apps/api/src/server.ts` | deprecate/delete public path | none | Safety critical | deprecate/delete | Raw events remain server-side or tightly restricted by policy. |

## Frontend data-access coupling inventory

| Surface | Current access pattern | Coupling risk | N2 action |
| --- | --- | --- | --- |
| `apps/web` feature controllers | Uses `yurbrainDomainClient` from `@yurbrain/client` for feed/capture/item/session/founder flows | Low runtime coupling, but package exports still allow accidental transport bypass | Migrate imports to explicit stable client entrypoint and tighten exports |
| `apps/mobile` loop controller | Uses `yurbrainDomainClient` from `@yurbrain/client` | Low runtime coupling, same export leakage risk | Keep shared domain methods, avoid mobile-specific transport fork |
| `packages/client` root exports | Exposes `api/*`, `hooks/*`, and `graphql/*` in addition to domain | Medium architectural coupling risk over time | Restrict public exports to domain interface and factory methods in N2 |

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
   - web/mobile provider wrappers and integration points.
3. Refactored web and mobile controllers to consume injected `YurbrainClient` instance.
4. Kept backend behavior unchanged (REST-backed by default) while adding Nhost transport scaffold.

## Unclassified capabilities

None in current scope. Every meaningful route/capability is classified above.

## Route replacement map

- CRUD to GraphQL: brain items, item artifacts reads, threads/messages, tasks, sessions, preferences/profile.
- Computed logic to Functions: capture pipeline, feed shaping, summarize progress, next step, plan conversion, founder review, diagnostics.
- Temporary legacy: `/functions/*` compatibility routes and `/preferences/:userId`.
- Delete: legacy feed generator and public `/events` endpoint.
