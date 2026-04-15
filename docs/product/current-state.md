# Yurbrain Current Implementation State

_Last audited: April 15, 2026 (UTC)._

This document is factual current state after code inspection plus command verification.

## Verified command evidence

Passing in this audit:
- `pnpm install`
- `pnpm reset`
- `pnpm seed`
- `pnpm --filter @yurbrain/contracts test`
- `pnpm --filter api test`
- `pnpm test:e2e`
- `pnpm lint`
- `pnpm build`
- `pnpm test`

Not used for runtime truth:
- `pnpm --filter @yurbrain/db db:migrate` (Drizzle CLI workflow; local runtime uses startup SQL migrations in `@yurbrain/db` repository initialization).

## What is fully implemented

### Core loop backend persistence (real)
- No critical runtime flow uses in-memory `Map`/singleton state for brain items, feed, threads/messages, tasks, sessions, and AI artifacts.
- API routes are DB-backed through `packages/db` repository:
  - Brain: `POST/GET/PATCH /brain-items`, `GET /brain-items/:id/artifacts`
  - Threads/messages: `POST /threads`, `GET /threads/:id`, `GET /threads/by-target`, `POST /messages`, `GET /threads/:id/messages`
  - Feed: `GET /feed`, `POST /feed/:id/dismiss`, `POST /feed/:id/snooze`, `POST /feed/:id/refresh`
  - Preferences: `GET /preferences/:userId`, `PUT /preferences/:userId`
  - Tasks/sessions: `POST/GET/PATCH /tasks`, `GET /tasks`, `POST /tasks/:id/start`, `POST /sessions/:id/pause`, `POST /sessions/:id/finish`, `GET /sessions`
  - AI: `POST /ai/summarize`, `POST /ai/classify`, `POST /ai/query`, `POST /ai/convert`, `POST /ai/feed/generate-card`
- Persistence across restart is covered by test (`apps/api/src/__tests__/sprint7/persistence.test.ts`).

### One coherent client loop (web, real)
- Web app (`apps/web/app/page.tsx`) supports:
  - capture brain item through a bottom-sheet style capture surface
  - fetch resurfaced feed cards
  - open item detail
  - add comments and ask AI
  - convert to task
  - start/finish sessions
  - refresh/reload continuity from DB-backed APIs
- Capture sheet now supports a mobile-first flow with autofocus and autosizing input, attachment/voice placeholders, and three actions:
  - Save
  - Save + Plan (routes to existing convert flow)
  - Save + Remind Later (current lightweight stub notice without new domain objects)
- Item detail continuation now uses one inline `CommentComposer` with mode toggle (`Comment` / `Ask Yurbrain`) so both flows share the same continuity surface.
- Ask mode now appends both user question and assistant reply into the same continuity timeline with explicit role labels (`You`, `Yurbrain`) for recognition-first re-entry.
- Item detail now includes suggested AI prompt chips and a lightweight related-items list so users can continue in-place without leaving the continuity surface.
- Convert `plan_suggested` outcomes now open a Plan Preview sheet in web, with editable per-step durations and actions to accept plan or start first step.
- Accepting a plan now creates real tasks from preview steps (preserving `sourceItemId` linkage), and optional start-first-step launches a real session.
- Convert responses now use typed outcomes (`task_created`, `plan_suggested`, `not_recommended`) and include optional `sourceItemId` / `sourceMessageId` linkage fields.
- Feed and item detail continuity UI now explicitly surfaces: why shown, where you left off, what changed, and smallest next move.
- Founder mode and default feed lens are now persisted in backend user preferences (`user_preferences`) and restored on reload.
- Item AI summary/classification continuity now uses persisted artifacts from API (`GET /brain-items/:id/artifacts`) rather than local-only cache.
- Task session continuity now uses persisted sessions from API (`GET /sessions?taskId=...`) rather than local-only session snapshots.
- Web now includes a dedicated Time home surface with deterministic time-window selection (`2h`, `4h`, `6h`, `8h`, `24h`, `custom`), a resume card for running/paused sessions, suggested tasks that fit the selected window, and a prominent "Start without planning" action.
- Mobile Time tab now mirrors the same lightweight planning intent with window selection and start-without-planning guidance to keep parity with web without introducing heavy planning UX.
- Web execution now includes an Active Task / Focus Mode surface with a large task hero, live session timer, reliable pause/finish controls, and an in-place source context peek that can reopen the linked item without leaving the execution flow.

### Feed semantics and contract (real)
- Feed ranking is deterministic with diversity/recency/actionability penalties/boosts.
- Snooze, dismiss, refresh state is persisted and honored by `GET /feed`.
- Feed contract now includes explicit action/state semantics used by UI:
  - `taskId`
  - `availableActions`
  - `stateFlags`
  - plus existing `whyShown` and timestamps.

### Seed/reset/run reliability (real)
- Root reset/seed flow works: `pnpm reset && pnpm seed`.
- Seed now creates a realistic MVP dataset for single-user QA:
  - 12 brain items
  - 8 feed cards
  - 3 threads with message history
  - 4 tasks
  - 3 sessions (including finished sessions)
  - persisted AI artifact history on at least one item.

## What is partially implemented

- Web and mobile are still prototype surfaces (hardcoded demo user id, minimal styling, limited UX polish).
- Mobile is not the primary full-loop surface; web is the validated end-to-end surface.
- AI outputs are deterministic runner + fallback behavior (useful for MVP continuity, not production intelligence).
- Monorepo lint/build coverage is uneven:
  - `pnpm lint` effectively validates packages that define lint scripts (mainly API).
  - `pnpm build` is effectively centered on web.

## What is placeholder or mocked

- AI execution remains a deterministic runner abstraction with fallback envelopes; no external production model integration required for MVP loop completion.
- `/ai/feed/generate-card` still supports placeholder defaults when title/body are omitted.

## What is not wired through persistence

- No critical core loop runtime path is currently blocked on in-memory state.
- Some non-critical UI conveniences (selected item/task/surface and execution lens) still use browser local storage for UX continuity.

## Known technical debt

- API route docs in `docs/architecture/api-routes-v1.md` still describe older AI path shapes (`/ai/brain-items/:id/...`) that do not match current runtime (`/ai/summarize`, `/ai/classify`, `/ai/query`).
- Repository uses app-local import path from API to `packages/db/src` instead of published package build boundaries.
- Database schema keeps `confidence` as text in artifacts for compatibility with current migrations.
- `/events` endpoint intentionally returns `403` until auth/per-user filtering is implemented.

## Missing pieces relative to full product direction (not MVP blockers)

- Auth/multi-user access control and user identity flows.
- Production deployment persistence hardening and operational migrations runbook for non-local environments.
- Richer client UX and mobile parity for full-loop interaction.

## Next milestone

Stabilize MVP for repeatable local demo + QA:
1. keep web loop as primary validated path,
2. align stale architecture docs with real routes/contracts,
3. tighten package boundaries and script coverage (lint/build/test parity),
4. prepare auth boundary without changing current object model.
