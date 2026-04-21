# Nhost Cutover Checklist

This checklist gates each migration stage to protect the Yurbrain continuity loop.

## Global no-regression gate

- [x] No direct GraphQL calls in React screens.
- [x] No direct Nhost function calls in React screens.
- [x] UI uses `packages/client` only.
- [ ] Product loop still works: capture, feed, item detail, comments, plan, session, founder review.
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

## Web cutover checklist (must complete before mobile cutover)

### Auth and current user

- [x] Web bootstrap resolves real current user via Nhost auth.
- [x] Demo-user fallback removed from web runtime path.
- [x] Unauthorized state is handled gracefully.

### CRUD path cutover

- [ ] Brain items read/write uses GraphQL-backed client wrappers.
- [ ] Threads/messages uses GraphQL-backed client wrappers.
- [ ] Tasks/sessions uses GraphQL-backed wrappers (or function helpers where required).
- [ ] Preferences/founder-mode uses GraphQL-backed wrappers.

### Function path cutover

- [ ] Feed is served by function-backed `getFeed`.
- [ ] Summarize/next-step routes are function-backed.
- [ ] Founder review and diagnostics are function-backed.

### Validation

- [x] Capture still works end-to-end.
- [x] Feed still loads and feels continuity-first.
- [x] Item detail continuity context still works.
- [x] Comments/continuation still persists and reads correctly.
- [x] Plan-this and session lifecycle are still coherent.
- [x] Founder review still produces concise, actionable output.

## Mobile cutover checklist (after web stability)

- [ ] Mobile bootstrap uses same authenticated client initialization.
- [ ] Capture uses shared domain client methods.
- [ ] Feed uses shared domain client methods.
- [ ] Item detail/comments use shared domain client methods.
- [ ] Plan/session path uses shared domain client methods.
- [ ] Founder-mode/founder-review integration remains coherent where applicable.
- [ ] No mobile-specific transport fork created.

## Post-cutover cleanup checklist

- [ ] Dead REST routes identified with no remaining callers.
- [ ] Temporary compatibility routes reviewed and either retained with rationale or removed.
- [ ] Legacy REST logic removed only after parity evidence.
- [ ] Public raw events route remains disabled/removed.
- [ ] Docs updated (`backend-migration-status`, runbook, transport policy).
- [ ] Final risk pass confirms no product-loop regression.
