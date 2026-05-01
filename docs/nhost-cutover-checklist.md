# Nhost Cutover Checklist

This checklist gates each migration stage to protect the Yurbrain continuity loop.

## Global no-regression gate

- [x] No direct GraphQL calls in React screens.
- [x] No direct Nhost function calls in React screens.
- [x] UI uses `packages/client` only.
- [x] Product loop still works: capture, feed, item detail, comments, plan, session, founder review.
- [x] N2 domain client/provider scaffolding added (`createYurbrainClient`, `yurbrainClient`, provider hooks) with no behavior cutover yet.

## Phase completion checkpoints

### N1: Audit + Migration Tracker

- [x] Capability inventory completed and classified.
- [x] Product-critical loop guardrails documented.
- [x] Route replacement map documented (GraphQL/Function/legacy/delete).
- [x] Migration control documents created (`backend-migration-status`, `client-transport-policy`, `nhost-migration-runbook`, `nhost-cutover-checklist`).

### N2: Domain Client Stabilization

- [x] Stable `YurbrainClient` interface and factory are established in `packages/client`.
- [x] Shared provider/hook is established in `packages/client` and consumed by web/mobile surfaces.
- [x] Package root exports are restricted to stable client entrypoints (no low-level transport re-exports).
- [x] Web/mobile controllers access backend through the shared client boundary.
- [x] `blockSession` client contract aligned to implemented behavior (`blockSession(sessionId)`).
- [x] Runtime remains parity-preserving (REST-backed by default; no backend cutover in N2).

### N3: Nhost Foundation Scaffolding

- [x] Explicit Nhost/Hasura environment-key contract documented (required vs optional keys, precedence, sample values) in `docs/nhost-env-contract.md` and linked from runbook.
- [x] Nhost cloud project configuration is intentionally dashboard-managed for staging/prod; `nhost/config.yaml` is a minimal Hasura v3 metadata pointer so metadata can apply without overriding cloud infrastructure config.
- [ ] Example `.env` files for web/mobile are aligned with the N3 env contract.
- [ ] Nhost bootstrap smoke check confirmed (`bootstrapNhostSession` returns `configured: true` when keys are present).
- [ ] Hasura GraphQL smoke check confirmed (`isHasuraGraphqlConfigured()` true and one read query succeeds in Nhost mode).

### N4: Web Auth / Current User Cutover

- [x] Web provider defaults to Nhost transport (`YurbrainClientProvider` uses `options={{ transport: "nhost" }}` in web layout).
- [x] Nhost bootstrap enables strict identity resolution mode to prevent demo/runtime user-id fallback on web auth paths.
- [x] When Nhost config is present but no session exists, bootstrap clears stale user/token state to allow proper unauthorized behavior.
- [x] Web Founder Review path surfaces explicit unauthorized state for 401 responses.
- [x] Strict identity mode now suppresses client-side `x-yurbrain-user-id` injection and sends explicit strict auth-mode header.
- [x] API strict mode requires bearer-derived identity and ignores header/query/body legacy fallbacks when strict mode is enabled.
- [x] Authenticated strict-mode loop smoke test passes (`auth/me` → capture → feed → item detail → comments → manual-convert plan → session pause/finish → founder review).

### N5: Schema + Permissions + Backfill Scaffolding

- [x] Profile scaffold table added (`profiles`) with deterministic backfill metadata (`backfill_source`, `backfilled_at`).
- [x] Sessions table includes nullable `user_id` scaffold column for future ownership simplification.
- [x] Repository includes profile scaffold operations (`get/upsert/list-needing-backfill/mark-backfilled`).
- [x] Backfill script scaffold added (`packages/db/src/scripts/n5-backfill-profiles.ts`) with dry-run support.
- [x] N5 profile repository/backfill tests added and passing.
- [x] Ownership backfills added for scaffolded `user_id` columns (`item_artifacts`, `item_threads`, `thread_messages`, `sessions`) with deterministic join order.
- [x] Required vs optional backfill phases and demo/founder mapping notes documented (`docs/nhost-hasura-permission-scaffold.md`).
- [x] Owner-scoped Hasura rule + insert preset scaffolding documented, including stricter treatment for `item_artifacts` and `events`.

### N6: GraphQL CRUD Wrappers in Client

- [x] Domain client exposes transport-safe GraphQL CRUD wrappers for web-cutover CRUD surfaces (brain item read/update, artifacts read, threads/messages, tasks/sessions, preferences) without changing UI call sites.
- [x] Loop-sensitive create capture flow (`createCaptureIntake`) and REST `createBrainItem` parity-sensitive side effects remain on non-GraphQL path until explicit side-effect parity is implemented.
- [x] Session list GraphQL path scopes by `sessions.user_id` (leveraging N5 ownership scaffolding) instead of legacy task-join fallback.
- [x] GraphQL CRUD wrappers continue to enforce owner scoping and preserve REST fallback when Hasura is not configured.
- [x] Targeted client tests cover N6 GraphQL wrapper behavior and function/REST boundaries.

### N10: Founder Review Functions + Web Integration

- [x] Founder review canonical route uses `/functions/founder-review`.
- [x] Founder diagnostics payload is actionable at item level (`summary`, `focusItems`, `focusActions`) with typed contract validation.
- [x] Founder Review web surface renders diagnostics and routes both item-level and feed-level follow-up actions through domain actions.
- [x] Founder diagnostics remains behind `packages/client` (`getFounderDiagnostics`) with no direct function/GraphQL leakage in UI surfaces.
- [x] Targeted API/client tests and manual walkthrough validate founder diagnostics actionability flow.

### N11: Event Safety Pass

- [x] Raw event access policy is explicit (`GET /events` remains disabled with explicit message).
- [x] Event write-path safety audit is completed for owner scoping and exposure boundaries across capture + brain-item routes.
- [x] Event policy hardening is implemented: event payloads are allowlisted/minimized and do not carry raw content.
- [x] Event safety parity evidence is captured across capture/feed/session/founder-review surfaces (strict-auth core loop + founder diagnostics + event-safety tests).

### N12: Mobile Cutover

- [x] Mobile provider/bootstrap cutover uses authenticated Nhost transport with no demo-user fallback.
- [x] Mobile loop surfaces (capture/feed/item/comments/plan/session) run through shared `packages/client` domain methods with parity checks.
- [x] N12 parity evidence captured before any mobile-specific transport divergence.

### N13: Legacy REST Strangler Cleanup

- [x] Dead compatibility aliases with no active callers are removed (`/functions/feed/rank`, `/functions/next-step`).
- [x] Duplicate/unused function session endpoints are removed in favor of canonical `/functions/session-helper`.
- [x] Legacy founder-review compatibility route (`/founder-review`) is removed; canonical `/functions/founder-review` remains.
- [x] Remaining legacy REST AI routes (`/ai/*`) are removed; canonical `/functions/*` routes are now the only in-repo AI endpoints.
- [x] Route deletion map and parity evidence are updated after each N13 cleanup slice.
## Web cutover checklist (must complete before mobile cutover)

### Auth and current user

- [x] Web bootstrap resolves real current user via Nhost auth.
- [x] Demo-user fallback removed from web runtime path.
- [x] Unauthorized state is handled gracefully.

### CRUD path cutover

- [x] Brain items read/write uses GraphQL-backed client wrappers where parity-safe (`list/get/update` GraphQL, `create` intentionally REST until side-effect parity slice).
- [x] Threads/messages uses GraphQL-backed client wrappers.
- [x] Tasks/sessions uses GraphQL-backed wrappers (or function helpers where required).
- [x] Preferences/founder-mode uses GraphQL-backed wrappers.

### Function path cutover

- [x] Feed is served by function-backed `getFeed`.
- [x] Summarize/next-step routes are function-backed.
- [x] Summarize/classify/query/convert thin-slice routes are function-backed.
- [x] Function ownership failures return graceful `404` responses (no internal-error leak).
- [x] Founder review and diagnostics are function-backed.
- [x] Founder review strict-auth loop validation uses canonical `/functions/founder-review` route.

### Validation

- [x] Capture still works end-to-end.
- [x] Feed still loads and feels continuity-first.
- [x] Item detail continuity context still works.
- [x] Comments/continuation still persists and reads correctly.
- [x] Plan-this and session lifecycle are still coherent.
- [x] Founder review still produces concise, actionable output.

## Mobile cutover checklist (after web stability)

- [x] Mobile bootstrap uses same authenticated client initialization.
- [x] Capture uses shared domain client methods.
- [x] Feed uses shared domain client methods.
- [x] Item detail/comments use shared domain client methods.
- [x] Plan/session path uses shared domain client methods.
- [x] Founder-mode/founder-review integration remains coherent where applicable.
- [x] No mobile-specific transport fork created.

## Post-cutover cleanup checklist

- [x] Dead REST routes identified with no remaining callers.
- [x] Temporary compatibility routes reviewed and either retained with rationale or removed.
- [ ] Legacy REST logic removed only after parity evidence.
- [x] Public raw events route remains disabled/removed.
- [x] Docs updated (`backend-migration-status`, runbook, transport policy).
- [x] Final risk pass confirms no product-loop regression.
