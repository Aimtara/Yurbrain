# Yurbrain Remaining Sprints — Tight Execution Plan

This plan assumes Sprint 1 foundations are in place and the next execution starts at Sprint 2.

## Delivery strategy (one PR per sprint)

1. **PR-1: Finish Sprint 2 completely (deterministic core loop, no AI).**
2. **PR-2: Finish Sprint 3 completely (AI added safely behind validation/fallbacks).**
3. **PR-3: Finish Sprint 4 completely (real feed generation + ranking loop).**
4. **PR-4: Finish Sprint 5 completely (task conversion + execution loop).**
5. **PR-5: Finish Sprint 6 completely (observability, reliability, QA hardening).**

---

## Execution tracker

- PR-1 (Sprint 2): ✅ Completed
- PR-2 (Sprint 3): ✅ Completed
- PR-3 (Sprint 4): ✅ Completed (April 13, 2026)
- PR-4 (Sprint 5): ✅ Completed (April 13, 2026)
- PR-5 (Sprint 6): ⏳ Not started

---

## PR-1 — Sprint 2 complete: deterministic loop end-to-end

**Definition of done**
- BrainItem, Thread, Message flows work API ↔ client ↔ UI.
- Feed endpoint serves stored cards deterministically.
- Manual (non-AI) item/comment → task conversion path is usable.

### File-by-file checklist

#### API (apps/api)
- [x] `apps/api/src/server.ts` — register Sprint 2 route groups and shared error mapping.
- [x] `apps/api/src/index.ts` — ensure startup path includes Sprint 2 routers/services.
- [x] `apps/api/src/routes/brain-items.ts` *(new)* — CRUD completion + list filters.
- [x] `apps/api/src/routes/threads.ts` *(new)* — create/get/by-target routes.
- [x] `apps/api/src/routes/messages.ts` *(new)* — create + list-by-thread routes.
- [x] `apps/api/src/routes/feed.ts` *(new)* — `GET /feed` static-from-storage endpoint.
- [x] `apps/api/src/routes/tasks.ts` *(new)* — temporary deterministic create-from-item/comment path.
- [x] `apps/api/src/services/feed/static-feed.ts` *(new)* — deterministic card retrieval/order.
- [x] `apps/api/src/services/tasks/manual-convert.ts` *(new)* — deterministic conversion rules.
- [x] `apps/api/src/__tests__/sprint2/*.test.ts` *(new)* — route + service behavior tests.

#### Database (packages/db)
- [x] `packages/db/src/schema.ts` — confirm Sprint 2 columns/indexes needed for thread/message/feed/task linkage.
- [x] `packages/db/migrations/0001_sprint2.sql` *(new)* — additive schema updates only.
- [x] `packages/db/src/index.ts` — export any added table/type handles.

#### Client (packages/client)
- [x] `packages/client/src/api/endpoints.ts` — add thread/message/feed/manual-convert endpoints.
- [x] `packages/client/src/hooks/useYurbrainApi.ts` — expose typed calls for Sprint 2 APIs.
- [x] `packages/client/src/hooks/useBrainItem.ts` — wire detail actions to live thread/message/task APIs.
- [x] `packages/client/src/hooks/useFeed.ts` — switch from mock/static to API-backed deterministic feed.
- [x] `packages/client/src/hooks/useMutations.ts` — add create-thread/send-message/manual-convert mutations.

#### UI (packages/ui + apps/mobile + apps/web)
- [x] `packages/ui/src/components/brain/BrainItemScreen.tsx` — integrate raw content, quick actions, comment preview with live data.
- [x] `packages/ui/src/components/brain/ItemChatPanel.tsx` — show thread messages + composer send path.
- [x] `packages/ui/src/components/feed/CommentComposer.tsx` — post to message/create-task deterministic handlers.
- [x] `packages/ui/src/components/feed/FeedCard.tsx` — bind card actions to stored-card feed model.
- [x] `apps/mobile/src/App.tsx` — connect tabs/screens to real Sprint 2 data hooks.
- [x] `apps/web/app/page.tsx` — verify web shell path for deterministic feed loop smoke coverage.

#### Contracts/tests/docs
- [x] `packages/contracts/src/api/api-contracts.ts` — add/lock DTOs required by Sprint 2 endpoints.
- [x] `packages/contracts/src/domain/domain.ts` — only additive fields if strictly required (no additional fields required for Sprint 2).
- [x] `docs/api/README.md` — document Sprint 2 endpoints and request/response examples.
- [x] `README.md` — update runbook for new routes and deterministic flow.

---

## PR-2 — Sprint 3 complete: AI safely layered

**Definition of done**
- AI runner is wrapped by strict envelope validation, timeout, and deterministic fallback.
- Summarize/classify/query endpoints persist artifacts and chat replies safely.

### File-by-file checklist
- [x] `packages/ai/src/runner.ts` *(new)* — provider-agnostic runner with timeout budget.
- [x] `packages/ai/src/validate.ts` *(new)* — response envelope/schema validation.
- [x] `packages/ai/src/fallbacks.ts` *(new)* — deterministic fallback builders.
- [x] `packages/ai/src/index.ts` — export runner/validation/fallback APIs.
- [x] `apps/api/src/routes/ai.ts` *(new)* — summarize/classify/query endpoints.
- [x] `apps/api/src/services/ai/summarize.ts` *(new)* — artifact generation + persistence.
- [x] `apps/api/src/services/ai/classify.ts` *(new)* — advisory classification handling.
- [x] `apps/api/src/services/ai/item-query.ts` *(new)* — assistant reply + thread persistence.
- [x] `packages/client/src/hooks/useMutations.ts` — add summarize/classify/query mutations.
- [x] `packages/ui/src/components/brain/BrainItemDetail.tsx` — summarize/classify triggers and state.
- [x] `packages/ui/src/components/brain/ItemChatPanel.tsx` — AI query mode wired with fallback states.
- [x] `packages/contracts/src/api/api-contracts.ts` — AI endpoint DTOs/envelopes.
- [x] `docs/architecture/ai-contracts-v1.md` — reflect final implemented envelope + fallback policy.
- [x] `apps/api/src/__tests__/sprint3/*.test.ts` *(new)* — timeout/invalid-output/fallback coverage.

---

## PR-3 — Sprint 4 complete: feed generation loop

**Definition of done**
- Candidate selection, card generation, and deterministic ranking/diversity are running.
- `GET /feed` supports lens, limit, and snoozed exclusions.

### File-by-file checklist
- [x] `apps/api/src/services/feed/candidates.ts` *(new)* — deterministic candidate gatherer.
- [x] `apps/api/src/services/feed/generate-card.ts` *(new)* — AI-backed + deterministic fallback card generation.
- [x] `apps/api/src/services/feed/rank.ts` *(new)* — ranking + diversity weights.
- [x] `apps/api/src/routes/feed.ts` — extend with lens/limit/snoozed behavior.
- [x] `packages/db/src/schema.ts` — add snooze/dismiss/refresh metadata as needed.
- [x] `packages/db/migrations/0002_sprint4.sql` *(new)* — additive feed metadata migration.
- [x] `packages/client/src/hooks/useFeed.ts` — add lens + pagination/limit + refresh hooks.
- [x] `packages/ui/src/components/feed/FeedLensBar.tsx` — full lens state to API query binding.
- [x] `packages/ui/src/components/feed/FeedCard.tsx` — dismiss/snooze/refresh interactions.
- [x] `docs/architecture/feed-logic-v1.md` — update with implemented selector/ranker behavior.
- [x] `apps/api/src/__tests__/sprint4/*.test.ts` *(new)* — ranking and diversity determinism tests.

---

## PR-4 — Sprint 5 complete: task conversion and action loop

**Definition of done**
- AI conversion endpoint returns create-task | mini-plan | not-recommended outcomes.
- Task CRUD and session start/pause/finish are complete.
- Comment→task conversion in UI requires explicit user confirmation.

### File-by-file checklist
- [x] `apps/api/src/routes/convert.ts` *(new)* — `POST /ai/convert` endpoint.
- [x] `apps/api/src/routes/tasks.ts` — full CRUD completion.
- [x] `apps/api/src/routes/sessions.ts` *(new)* — start/pause/finish routes.
- [x] `apps/api/src/services/tasks/convert.ts` *(new)* — decision and linkage policy.
- [x] `apps/api/src/services/sessions/lifecycle.ts` *(new)* — session state machine.
- [x] `packages/contracts/src/api/api-contracts.ts` — conversion/task/session DTOs.
- [x] `packages/client/src/hooks/useMutations.ts` — convert + task + session mutations.
- [x] `packages/ui/src/components/tasks/TaskDetailCard.tsx` — task update + start controls.
- [x] `packages/ui/src/components/tasks/ActiveSessionScreen.tsx` — pause/finish flow.
- [x] `packages/ui/src/components/feed/CommentComposer.tsx` — explicit confirmation modal for comment→task.
- [x] `packages/db/src/schema.ts` — finalize task/session source-link fields.
- [x] `packages/db/migrations/0003_sprint5.sql` *(new)* — additive task/session migration.
- [x] `apps/api/src/__tests__/sprint5/*.test.ts` *(new)* — convert outcomes + session lifecycle tests.

---

## PR-5 — Sprint 6 complete: reliability and QA hardening

**Definition of done**
- Observability in place for AI/feed critical paths.
- User-visible error/fallback states have no dead ends.
- E2E flow validates full product loop.

### File-by-file checklist
- [ ] `apps/api/src/middleware/observability.ts` *(new)* — request correlation, timing, error envelopes.
- [ ] `apps/api/src/services/ai/*.ts` — structured logs for AI request/response/fallback paths.
- [ ] `apps/api/src/services/feed/*.ts` — structured logs for refresh/candidate/rank steps.
- [ ] `packages/client/src/hooks/useMutations.ts` — normalized error mapping for UI.
- [ ] `packages/ui/src/components/**` — add explicit empty/error/retry states where missing.
- [ ] `apps/mobile/src/App.tsx` — wire dead-end-safe fallback navigation.
- [ ] `apps/web/app/page.tsx` — smoke fallback states for web shell.
- [ ] `apps/api/src/__tests__/sprint6/*.test.ts` *(new)* — reliability and fallback tests.
- [ ] `e2e/full-loop.spec.ts` *(new)* — capture → resurface → comment/query → convert → act flow.
- [ ] `README.md` — final QA + observability runbook section.

---

## Execution guardrails (apply to every PR)

- Keep each PR sprint-scoped; do not blend future-sprint features.
- Require passing tests for touched layers (API, client hooks, UI behavior).
- Use additive migrations only; never mutate historical migration files.
- Enforce deterministic fallback for every AI-dependent user path.
- Add or update docs in the same PR so implementation and docs stay synchronized.
