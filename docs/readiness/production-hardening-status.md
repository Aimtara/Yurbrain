# Production hardening status

Last updated: 2026-04-30

## Current recommendation

- **Alpha:** conditional no-go until this hardening run and local verification complete.
- **Production:** **NO-GO**. Production still requires external staging evidence, two-user isolation proof against real deployed users, alert test evidence, rollback rehearsal, backup/restore drill, launch-scope approvals, and final human go/no-go approval.

## Stage 0 baseline audit

This audit inspected the current Yurbrain repository before implementation work. The repository is already materially hardened beyond prototype state, but several code, test, documentation, and external evidence gaps remain.

### Code locations inspected

- API server and middleware:
  - `apps/api/src/server.ts`
  - `apps/api/src/middleware/current-user.ts`
  - `apps/api/src/middleware/rate-limit.ts`
  - `apps/api/src/middleware/observability.ts`
- Protected API routes:
  - `apps/api/src/routes/brain-items.ts`
  - `apps/api/src/routes/capture.ts`
  - `apps/api/src/routes/tasks.ts`
  - `apps/api/src/routes/sessions.ts`
  - `apps/api/src/routes/preferences.ts`
  - `apps/api/src/routes/functions.ts`
  - `apps/api/src/routes/ai.ts`
  - `apps/api/src/routes/feed.ts`
  - `apps/api/src/routes/explore.ts`
- Event and Founder Review services:
  - `apps/api/src/services/events/policy.ts`
  - `apps/api/src/services/founder-review/*`
  - `apps/api/src/services/functions/founder-review-logic.ts`
- Contracts and clients:
  - `packages/contracts/src/api/api-contracts.ts`
  - `packages/contracts/src/domain/domain.ts`
  - `packages/client/src/domain/client.ts`
  - `packages/client/src/hooks/useMutations.ts`
  - `packages/client/src/hooks/useYurbrainApi.ts`
  - `packages/client/src/graphql/*`
- AI/LLM paths:
  - `apps/api/src/services/ai/provider/*`
  - `apps/api/src/services/functions/summarize-progress-llm.ts`
  - `apps/api/src/services/functions/what-should-i-do-next-llm.ts`
  - `apps/api/src/services/functions/*-prompt.ts`
- UI/product copy:
  - `packages/ui/src/components/capture/CaptureComposer.tsx`
  - `packages/ui/src/components/feed/FocusFeedScreen.tsx`
  - `packages/ui/src/components/feed/FeedCard.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/src/features/*`
- Existing tests and scripts:
  - `apps/api/src/__tests__/**`
  - `packages/client/src/__tests__/**`
  - `apps/web/src/__tests__/production-ux-smoke.test.ts`
  - root `package.json`
  - `.github/workflows/nhost-production-safety.yml`
  - `tooling/scripts/*`

### Completed or mostly completed areas

| Area | Current state |
| --- | --- |
| Current-user enforcement | Protected API routes generally call `requireCurrentUser()` and scope resources with `currentUser.id` or `canAccessUser()`. |
| `/auth/me` | Implemented and returns verified/current identity. |
| Preferences normal route | `/preferences/me` exists and is current-user scoped. |
| Legacy preferences route | `/preferences/:userId` is retained for compatibility, ignores the path owner for normal users, and sends deprecation headers pointing to `/preferences/me`. |
| Raw events | `/events` returns 403 and is not broadly exposed. |
| Founder Review | Function routes derive `userId` from `currentUser.id` and parse only `window` / `includeAi`. |
| Event payload safety | Existing tests verify allowlisted event payload fields and no broad raw payload exposure in diagnostics. |
| Rate limiting | Route-class rate limiting exists for auth, feed, AI, storage/write, diagnostics, and standard read/write classes. Stage 3 added canonical rate-limit docs and targeted AI/write-heavy/health route regression coverage. |
| Deterministic AI fallback | LLM routes keep deterministic fallback behavior for provider, timeout, parse, and quality failures. |
| Web-first posture | Web is the primary production surface; mobile already has a deferred build script. |
| CI | Existing workflow runs install, typecheck, lint, tests, build, safety checks, and e2e on `main` / `cursor/**`. |
| Stage 2 analytics safety | Founder Review and diagnostics continue to parse only `window` / `includeAi`, derive owner context from verified current user, and expose derived summaries/actions rather than raw events. |

### Remaining blockers and risks

| Risk | Severity | Evidence | Planned change in this run |
| --- | --- | --- | --- |
| External request contracts still expose optional caller-owned `userId`. | Closed locally | Stage 1 removed optional `userId` from normal protected request/query schemas in `packages/contracts/src/api/api-contracts.ts`. | Keep response owner metadata only; monitor any downstream callers still sending rejected owner fields. |
| Client helpers can still send legacy `userId` query/path values. | Mostly closed locally | Stage 1 stopped first-party task/session helpers from sending owner query params and made normal preference helpers use `/preferences/me`. Legacy preference overloads remain compatibility-only. | Document `/preferences/me` as normal and remove legacy overloads in a future breaking-change window. |
| Direct app imports from package internals exist. | Medium | Found imports from `packages/contracts/src` and `packages/db/src` in API/web founder-review code. | Replace with package-root imports and add a CI-checkable package-boundary script. |
| LLM model routing is not explicit. | Medium | Provider uses one global `YURBRAIN_LLM_MODEL`. | Add task-class model routing with safe defaults and env overrides. |
| LLM semantic caching is missing. | Medium | Synthesis routes always build prompt / invoke fallback/provider for repeated unchanged contexts. | Add artifact-backed cache with conservative fingerprints and tests. |
| Context pruning is bounded but not explicit enough. | Medium | Current grounding uses latest user continuation only; no explicit last-three-turn policy. | Include at most the last three user/assistant turns per item/thread and test pruning. |
| Canonical readiness docs are incomplete/missing. | Medium | Several requested docs do not exist under canonical lowercase paths. | Create/update readiness, architecture, AI, and product docs. |
| Staging evidence automation is missing. | High for production | No staging smoke scripts under `tooling/scripts`. | Add env-driven staging and two-user isolation smoke scripts plus operator checklist. |
| External launch evidence is unavailable from the repo. | Production blocker | No real staging packet, alert, rollback, backup/restore, or human approvals. | Document manual production tasks and keep production no-go. |

### Legacy compatibility exceptions

- `/preferences/:userId` remains as a deprecated compatibility route. It must not be used by normal new clients. It is current-user scoped and must keep deprecation headers until removed in a separately planned breaking-change window.
- Existing domain response objects may continue to include `userId` as resource ownership metadata. The production blocker is caller-supplied owner selection in protected external request contracts, not owner fields in authenticated responses.
- Nhost usage in app code is allowed only inside accepted auth/provider boundaries (`apps/*/src/nhost/*`) and package-level adapters (`packages/client`, `packages/nhost`). UI feature components should not contain raw GraphQL, Hasura-specific syntax, or direct Nhost calls.

## Work planned in this run

1. Close unsafe caller-owned identity contracts and tests. **Stage 1 update:** normal protected request schemas now reject caller-supplied `userId` for create/capture/task/convert/session-list paths, and first-party REST helpers no longer send task/session owner query params. Legacy preference helpers still exist for compatibility but normal client paths use `/preferences/me`.
2. Re-confirm Founder Review, diagnostics, and raw event safety.
3. Strengthen rate-limit tests and canonical docs. **Stage 3 update:** `docs/readiness/rate-limits.md` now documents defaults and env overrides; tests cover AI route throttling, write-heavy throttling, and safe health probe behavior.
4. Remove package-internal imports and add boundary tooling.
5. Add LLM model routing, explicit context pruning, and artifact-backed semantic caching.
6. Adjust onboarding/first-run copy toward progressive disclosure.
7. Add staging smoke automation and manual evidence templates.
8. Run local quality checks and record exact results.
9. Update final current-state, alpha-readiness, manual tasks, and go/no-go docs.

## Evidence status

No commands from this execution run have been recorded yet beyond audit searches and source inspection. Final verification commands and results will be appended in Stage 8.
