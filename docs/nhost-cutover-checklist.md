# Nhost Cutover Checklist

This checklist gates each migration stage to protect the Yurbrain continuity loop.

## Global no-regression gate

- [ ] No direct GraphQL calls in React screens.
- [ ] No direct Nhost function calls in React screens.
- [ ] UI uses `packages/client` only.
- [ ] Product loop still works: capture, feed, item detail, comments, plan, session, founder review.

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
