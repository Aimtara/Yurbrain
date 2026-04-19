# Cursor-Ready Prompts

These prompts are designed to be pasted directly into Cursor (or similar coding-agent environments) for execution inside the Yurbrain monorepo.

## Prompt 1 — Repo Audit + Truth Pass

```text
You are working in the Yurbrain monorepo.

Your job is to establish the truthful current implementation state of the repo.

Goals:
1. Audit the codebase and identify what is fully implemented, partially implemented, mocked, or still relying on in-memory state.
2. Create or update `docs/product/current-state.md`.
3. Create or update `docs/dev/runbook.md` with exact local setup and run instructions.
4. Do not add any new features in this pass.
5. Do not change architecture unless needed to fix broken scripts or unblock execution.

Important constraints:
- Be factual, not aspirational.
- If a system is stubbed, say it is stubbed.
- If a route exists but is not truly persistent, mark it partial.
- Preserve existing contracts unless absolutely necessary.
- Prefer small, clean edits.

Audit focus:
- root scripts
- apps/api
- apps/web
- apps/mobile
- packages/contracts
- packages/db
- packages/client
- packages/ui
- test setup
- migrations
- seed/reset flow

Deliverables:
- updated `docs/product/current-state.md`
- updated `docs/dev/runbook.md`
- fixed package scripts if broken

Before finishing:
- run all relevant local commands
- document what works and what fails
- provide a concise summary of findings
```

## Prompt 2 — Eliminate In-Memory State

```text
You are working in the Yurbrain monorepo.

Your job is to remove all critical in-memory runtime persistence from the backend and replace it with repository-backed DB persistence.

Goals:
1. Find every use of in-memory state in backend services and routes.
2. Implement or complete repository modules in `packages/db/src/repositories`.
3. Refactor backend services to use repositories instead of runtime Maps/arrays/singletons.
4. Keep the external API shape stable.
5. Do not add new features beyond what is necessary for persistent MVP behavior.

Required repository coverage:
- brain items
- threads
- messages
- feed cards
- tasks
- sessions

Constraints:
- Keep contracts authoritative.
- Do not redesign the domain model.
- Use the simplest persistent implementation that works.
- Preserve current behavior where possible.
- If schema changes are required, update migrations cleanly.

Required validation:
- fresh migrate
- seed
- run API
- manually verify create/read/update flows

Definition of done:
- no critical runtime state depends on in-memory stores
- core routes are DB-backed
- migrations run cleanly
- persistence survives restart

Deliverables:
- repository implementations
- service refactors
- any necessary migration updates
- concise summary of what was changed
```

## Prompt 3 — Seed / Reset / Dev Reliability

```text
You are working in the Yurbrain monorepo.

Your job is to make local development reliable and repeatable.

Goals:
1. Add or fix DB seed script.
2. Add or fix DB reset flow.
3. Normalize root scripts so developers can install, migrate, seed, and run the system consistently.
4. Update the dev runbook if needed.

Required commands to support:
- install
- db:migrate
- db:seed
- db:reset
- dev:api
- dev:web
- dev:mobile
- dev:all

Seed requirements:
- 1 test user
- 10–20 brain items
- feed cards
- threads/messages
- tasks
- sessions

Constraints:
- seed data should support real manual QA
- do not depend on hidden env assumptions
- keep scripts simple and explicit

Definition of done:
- a new developer can reset and run the repo from scratch
- seed data creates a meaningful MVP state
```

## Prompt 4 — Core Loop UI Completion

```text
You are working in the Yurbrain monorepo.

Your job is to complete one coherent end-to-end MVP loop on the fastest usable client surface.

Primary goal:
A single user can:
- capture a brain item
- see a resurfaced feed card
- open the item
- comment or ask AI
- convert to task
- start a session
- finish a session
- refresh and retain continuity

Instructions:
1. Choose the fastest client surface to complete the loop, usually web.
2. Use shared contracts and client packages where appropriate.
3. Do not optimize for visual polish yet.
4. Prioritize coherence, persistence, and correct state transitions.

Required screens or flows:
- capture
- focus feed
- brain item detail
- comment thread
- AI query
- task conversion
- task/session flow

Constraints:
- do not introduce future-phase features
- do not build advanced personalization
- do not build spatial mode
- do not fake successful persistence

Definition of done:
- the full loop works end-to-end against persistent backend state
- refresh/restart does not lose user progress
```

## Prompt 5 — Feed Quality Pass

```text
You are working in the Yurbrain monorepo.

Your job is to improve the feed so it feels intentional and useful.

Goals:
1. Ensure the feed card contract has enough fields for meaningful rendering.
2. Improve deterministic ranking quality.
3. Implement or tighten dismiss and snooze behavior.
4. Ensure each card can explain why it surfaced.

Feed priorities:
- relevance
- diversity
- continuity
- low noise
- explainability

Do not:
- add complicated recommendation systems
- add AI-heavy feed logic unless already part of architecture
- overfit ranking beyond MVP needs

Definition of done:
- feed cards feel meaningfully selected
- repeated refreshes do not produce confusing noise
- dismiss and snooze persist correctly
```

## Prompt 6 — AI Quality Tightening

```text
You are working in the Yurbrain monorepo.

Your job is to improve AI usefulness in the MVP without expanding scope.

Focus only on:
- summarize
- item chat
- task conversion
- fallback behavior

Requirements:
- responses must be grounded in item content
- outputs must remain structured and compatible with contracts
- failure states must not dead-end the UI
- user must be able to continue without AI if needed

Do not:
- introduce multi-agent orchestration
- redesign the AI architecture
- broaden into future memory intelligence phases

Definition of done:
- AI feels helpful, not generic
- failures degrade gracefully
- task conversion outputs are realistic and actionable
```

## Prompt 7 — New Captures Review + Feed Slicers

```text
You are working in the Yurbrain monorepo.

Your task is to implement/finish:
1. New Captures Review layer
2. Feed slicer alignment only where gaps still exist

This is part of the core Yurbrain loop:
Capture → Review → Resurface → Continue → Act

FIRST: AUDIT BEFORE CHANGING

1. Inspect contracts, API routes, and web/mobile feed surfaces.
2. Confirm what is already shipped for lens-based feed browsing.
3. Implement only missing deltas (do not rewrite already-working lens flow).

PART 1 — New Captures Review

Goal:
Allow users to lightly review recent captures without forcing processing.

Backend:
1. Extend BrainItem:
   - add field: `isNew` (boolean) OR `lastViewedAt` (preferred if you want better auditability)
2. Add endpoint:
   - `GET /brain-items/new`
   - returns items created within recent window (recommend 24–72h) and not yet seen by user
3. Add endpoint:
   - `POST /brain-items/mark-seen`
   - payload: `{ itemIds: string[] }`

PART 2 — Feed Integration

Add New Captures Shelf:
- If user has new items, show at top of feed:
  - `New Captures (N)`
  - horizontal scroll list

Each card should include:
- title/snippet
- timestamp
- minimal UI

PART 3 — Review Panel

Create component:
- `NewCapturesPanel`

Triggered by:
- tapping “New Captures”
- optional prompt on app open

Show:
- list of new items

Per-item actions:
- Keep (default)
- Add note
- Ask Yurbrain
- Dismiss

Bulk actions:
- Mark all as seen
- Summarize these
- Show similar

PART 4 — Feed Slicers

Goal:
Enable browsing by mental categories.

Add to Feed UI:
- top horizontal lens selector:
  - All
  - Keep in Mind
  - Open Loops
  - In Progress
  - Learning
  - Recently Commented

Optional future lens (only if truly needed after audit):
- New

Backend:
- extend feed endpoint:
  - `GET /feed?lens=...`

Filter logic:
- Keep in Mind → low-action items
- Open Loops → incomplete threads
- In Progress → execution items
- Learning → inferred topic / learning-oriented items
- Recently Commented → recent interaction

PART 5 — State Handling

- persist selected lens locally
- persist dismissed “new captures” prompt
- mark items as seen when:
  - opened
  - or explicitly marked seen

PART 6 — UX Rules

Do NOT:
- require categorization
- create inbox workflows
- add task creation prompts
- add dashboards
- add complex filtering UI

Keep the experience:
- lightweight
- fast
- optional
- calm

OPTIONAL GUIDANCE — MAP TO EXISTING COMPONENT STRUCTURE

Use these likely integration points:
- Web feature orchestration:
  - `apps/web/src/features/feed/FocusFeedSurface.tsx`
  - `apps/web/src/features/feed/useFeedController.ts`
- Shared feed UI:
  - `packages/ui/src/components/feed/FocusFeedScreen.tsx`
  - `packages/ui/src/components/feed/FeedLensBar.tsx`
  - `packages/ui/src/components/feed/ClusterCard.tsx`
- API routes:
  - `apps/api/src/routes/brain-items.ts`
  - `apps/api/src/routes/feed.ts`
- Contracts + client:
  - `packages/contracts/src/domain/domain.ts`
  - `packages/contracts/src/api/api-contracts.ts`
  - `packages/client/src/api/endpoints.ts`

OUTPUT FORMAT

Before coding:
- outline implementation plan + explicit "already implemented vs missing" checklist

After coding:
- list files changed
- describe UX flow
- identify any gaps or follow-up work

SUCCESS CRITERIA

User can:
1. Capture items without friction
2. See “new captures” later
3. Browse them lightly
4. Ignore them if desired
5. Explore feed by human-readable lens instead of search

Final note:
This closes the post-capture gap by defining a soft, optional review layer and clearer feed slicing behavior.
```
