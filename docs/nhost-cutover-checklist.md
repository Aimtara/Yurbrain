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

- [x] Nhost runtime config resolver supports Next/Expo env keys and shared `YURBRAIN_*` keys.
- [x] Nhost service URLs can be derived from subdomain/region when explicit URLs are absent.
- [x] Nhost bootstrap hydrates GraphQL endpoint config for downstream Hasura client usage.
- [x] Nhost bootstrap keeps runtime behavior parity-preserving (REST default unchanged when no Nhost config).
- [x] Nhost foundation has targeted unit coverage for resolver + bootstrap defaults.

## Web cutover checklist (must complete before mobile cutover)

### Auth and current user

- [ ] Web bootstrap resolves real current user via Nhost auth.
- [ ] Demo-user fallback removed from web runtime path.
- [ ] Unauthorized state is handled gracefully.

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

- [ ] Capture still works end-to-end.
- [ ] Feed still loads and feels continuity-first.
- [ ] Item detail continuity context still works.
- [ ] Comments/continuation still persists and reads correctly.
- [ ] Plan-this and session lifecycle are still coherent.
- [ ] Founder review still produces concise, actionable output.

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
