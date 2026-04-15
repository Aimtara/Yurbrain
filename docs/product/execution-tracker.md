# Yurbrain Major Implementation Push — Execution Tracker

This tracker translates the latest implementation plan into a single execution document for Cursor and AI agents.

## Purpose

Build the next major Yurbrain product push while preserving the core loop:

**Capture → Resurface → Comment/Query → Convert → Act**

## Guiding principles

- Capture first, decide later.
- Feed is a memory surface, not a strict todo list.
- AI is optional and assistive, never mandatory.
- Prioritize deterministic behavior before AI enhancements.
- Keep language and UX supportive, non-punitive.
- Preserve source linkage across BrainItems, comments, feed cards, tasks, and sessions.
- Keep web/mobile parity where practical; optimize MVP for Focus Mode first.
- Avoid schema/domain churn unless explicitly required by a ticket.

---

## Recommended wave order

### Wave 1 — Make the current loop feel real

1. YB-101 — Capture Sheet UX
2. YB-102 — Feed Card contract upgrade
3. YB-103 — Feed lenses + ranking foundation
4. YB-105 — Inline comments + Ask Yurbrain toggle
5. YB-106 — Brain Item detail + related items + AI prompts

### Wave 2 — Build the execution bridge

6. YB-201 — Plan Preview sheet
7. YB-202 — Task conversion refinement
8. YB-204 — Active Task / Focus Mode
9. YB-205 — Finish / Rebalance sheet
10. YB-206 — Postpone / Reschedule sheet

### Wave 3 — Tighten reflection and personalization

11. YB-301 — Me tab insights
12. YB-302 — Personalization + render mode preferences
13. YB-303 — Explore Mode data contract only

---

## Cursor implementation sequence (contract-first)

Use this sequence for lower rework when running Cursor bots:

1. YB-102
2. YB-103
3. YB-104
4. YB-101
5. YB-105
6. YB-106
7. YB-201
8. YB-202
9. YB-203
10. YB-204
11. YB-205
12. YB-206
13. YB-301
14. YB-302
15. YB-303

---

## Updated merge order (owner-role aligned)

| Merge Order | Ticket | Owner Role |
| --- | --- | --- |
| 1 | YB-102 | Backend / Persistence Agent |
| 2 | YB-101 | UX / Frontend Agent |
| 3 | YB-103 | Backend / Persistence Agent + UX / Frontend Agent |
| 4 | YB-104 | Backend / Persistence Agent |
| 5 | YB-105 | UX / Frontend Agent + AI Behavior Agent |
| 6 | YB-201 | UX / Frontend Agent |
| 7 | YB-202 | AI Behavior Agent + Backend / Persistence Agent |
| 8 | YB-106 | UX / Frontend Agent + AI Behavior Agent |
| 9 | YB-203 | UX / Frontend Agent |
| 10 | YB-204 | UX / Frontend Agent |
| 11 | YB-206 | UX / Frontend Agent + Backend / Persistence Agent |
| 12 | YB-205 | UX / Frontend Agent + AI Behavior Agent |
| 13 | YB-302 | UX / Frontend Agent + Backend / Persistence Agent |
| 14 | YB-301 | Backend / Persistence Agent + UX / Frontend Agent |
| 15 | YB-303 | Backend / Persistence Agent |

---

## Master board (owner role + dependencies)

| Ticket | Title | Owner Role | Effort | Depends On | Status |
| --- | --- | --- | --- | --- | --- |
| YB-101 | Capture Sheet UX | UX / Frontend Agent | M | None | Done |
| YB-102 | FeedCard contract upgrade | Backend / Persistence Agent | M | None | Done |
| YB-103 | Feed lenses + filtering | Backend / Persistence Agent + UX / Frontend Agent | M | YB-102 | Done |
| YB-104 | Deterministic feed ranking v1 | Backend / Persistence Agent | M | YB-102 | Done |
| YB-105 | CommentComposer + Ask Yurbrain toggle | UX / Frontend Agent + AI Behavior Agent | M | YB-102 | Done |
| YB-106 | Brain Item Detail surface | UX / Frontend Agent + AI Behavior Agent | M/L | YB-105 | Done |
| YB-201 | Plan Preview sheet | UX / Frontend Agent | M | YB-102 | Done |
| YB-202 | Convert flow refinement | AI Behavior Agent + Backend / Persistence Agent | M | YB-201 (optional) | Done |
| YB-203 | Time Tab + time-window selector | UX / Frontend Agent | M | YB-202 | Done |
| YB-204 | Active Task / Focus Mode | UX / Frontend Agent | M | YB-203 | Done |
| YB-205 | Finish / Rebalance sheet | UX / Frontend Agent + AI Behavior Agent | M | YB-204 | Done |
| YB-206 | Postpone / Reschedule sheet | UX / Frontend Agent + Backend / Persistence Agent | S/M | YB-204 | Done |
| YB-301 | Me tab insights surface | Backend / Persistence Agent + UX / Frontend Agent | M | YB-204, YB-205 | Done |
| YB-302 | Personalization settings | UX / Frontend Agent + Backend / Persistence Agent | S/M | None | Done |
| YB-303 | Explore Mode data contract only | Backend / Persistence Agent | S | YB-102 | Done |

### Shared-ticket ownership rule

- First-listed role = implementation lead.
- Second-listed role = consult/review role.
- Integration / QA Agent validates merged output.

---

## Ticket definitions and acceptance criteria

### Epic A — Capture and memory surfacing

#### YB-101 — Build mobile-first Capture Sheet

**Goal:** frictionless intake via bottom sheet / modal.

**Scope:** autofocus, autosizing input, Save / Save+Plan / Save+Remind, attachment row placeholder, voice stub, subtle success micro-state.

**Acceptance criteria:** open from app shell, instant focus, Save creates BrainItem with minimal fields, Save+Plan routes to planning stub/flow, Save+Remind routes to postpone/remind stub/flow, no forced tags/folders/due-date.

#### YB-102 — Upgrade FeedCard domain and render contract

**Goal:** richer resurfacing expression.

**Contract fields:** `whyShown`, `cardType`, `lens`, `primaryActions`, `commentPreview`, `sourceItemId`, `recencyBucket`, `resurfaceReason`, `dismissState`, `snoozeState`.

**Acceptance criteria:** explain why shown, card types render distinctly, inline comment preview, stable cross-platform contract.

#### YB-103 — Implement FeedLensBar and deterministic lens filtering

**Lens set:** All, Keep in Mind, Open Loops, In Progress, Learning, Recently Commented.

**Acceptance criteria:** sticky lens bar, deterministic filtering, shared lens enum/contract for web+mobile, default lens = All.

#### YB-104 — Implement deterministic feed ranking v1

**Ranking inputs:** recency, postpone count, comment activity, in-progress state, open-loop weight, keep-in-mind weight, diversity penalty.

**Acceptance criteria:** deterministic + test-covered ranking; explainability via `whyShown`; no AI required.

#### YB-105 — Build inline CommentComposer with Ask Yurbrain toggle

**Modes:** Normal Comment, Ask Yurbrain.

**Acceptance criteria:** expanding composer, immediate inline append for normal comment, ask-mode appends user+AI responses inline, clear visual distinction between AI/user.

#### YB-106 — Build Brain Item Detail surface

**Scope:** original content, optional AI summary, suggested prompts, item chat, related items, quick actions (Summarize, Similar items, Plan this, Comment, Keep in mind).

**Acceptance criteria:** open from feed, read full content, comment/query in place, render related items when available, AI summary optional.

### Epic B — Conversion and execution

#### YB-201 — Build Plan Preview sheet

**Scope:** proposed plan header, generated task list, editable durations, reorder support, soft capacity warning, actions (Accept Plan, Edit, Start First Step).

**Acceptance criteria:** opens from AI/manual conversion, edit before acceptance, supportive warning, acceptance creates real tasks.

#### YB-202 — Refine convert-to-task flow

**Scope:** preserve source item/comment/thread linkage; return typed result: `task_created`, `plan_suggested`, `not_recommended`.

**Acceptance criteria:** typed+validated outputs, source linkage on created tasks, UI can distinguish direct task vs multi-step plan.

#### YB-203 — Build Time Tab home and time-window selector

**Time windows:** 2h, 4h, 6h, 8h, 24h, Custom.

**Acceptance criteria:** selector on web+mobile, suggested tasks fit selected window, resume card when session exists, “Start without planning” available.

#### YB-204 — Build Active Task / Focus Mode

**Scope:** task hero, timer, pause/finish controls, source context peek, basic session state.

**Acceptance criteria:** start from plan or task, simplified visual hierarchy, reliable pause/finish, context peek without leaving.

#### YB-205 — Build Finish / Rebalance sheet

**Scope:** planned vs actual, reclaimed/overflow delta, actions (Continue Plan, Rebalance Day, Take a Break, Schedule Rest Later).

**Acceptance criteria:** shown immediately after finish, neutral/supportive wording, no punitive red-state language, can trigger rebalance suggestions.

#### YB-206 — Build Postpone / Reschedule sheet

**Quick actions:** Later today, Tomorrow, Suggest a slot, Break into smaller step.

**Acceptance criteria:** one-tap completion, no forced calendar input, preserve postpone count, repeated postpones can influence ranking later.

### Epic C — Reflection, personalization, future-proofing

#### YB-301 — Build Me tab insights surface

**Scope:** top insight card, estimation accuracy, carry-forward pattern, postponement pattern, recommendation block.

**Acceptance criteria:** readable/simple surface, plain language, supportive (not punitive analytics dashboard).

#### YB-302 — Build personalization settings

**Scope:** Focus/Explore mode toggle, AI summary mode, feed density, resurfacing intensity.

**Acceptance criteria:** preferences persist, app can read them, Explore toggle exists even if Explore UI is not yet built.

#### YB-303 — Add Explore Mode data contract only

**Scope:** data fields for cluster membership, position, grouping metadata, manual grouping, salience/prominence.

**Acceptance criteria:** contract exists, no full canvas UI required, Focus Mode path unaffected if Explore preference is set.

---

## Global Cursor prompt preamble (paste at top of each ticket prompt)

Detailed per-ticket prompts are available in: `docs/prompts/major-push-ticket-prompts.md`.

```md
You are working inside the Yurbrain monorepo.

Context:
Yurbrain is an AI-powered second brain centered on the loop:
Capture → Resurface → Comment/Query → Convert → Act.

Product principles:
- Capture first, decide later.
- The feed is not a to-do list; it is a memory surface.
- AI is assistive and optional, not forced.
- The system must be non-punitive and supportive.
- Focus Mode (structured) is the MVP default.
- Explore Mode (spatial/visual) must be architecturally possible later.
- Prefer deterministic ranking and behavior before AI enhancement.
- Preserve source linkage between captured items, comments, feed cards, tasks, and sessions.

Engineering rules:
- Do not modify frozen schemas or enums unless the task explicitly requires it.
- Do not introduce new domain objects unless absolutely necessary.
- Keep changes scoped to the requested task.
- Add or update tests for all new business logic.
- Prefer deterministic code over clever abstractions.
- Use existing packages and boundaries where possible.
- Avoid one-off hacks in app code when logic belongs in shared packages.
- Keep web and mobile parity in mind, but optimize MVP for Focus Mode first.

Output requirements:
- First inspect the existing files before changing anything.
- Then make a short implementation plan.
- Then implement.
- Then summarize exactly what changed, any assumptions, and any follow-up work.
```

---

## Execution cadence for each ticket

1. Paste the global preamble.
2. Paste exactly one ticket prompt.
3. Ask Cursor to run a repo-wide cleanup pass for import drift, contract drift, duplicated logic, missing tests, and extraction opportunities.
4. Ask Cursor for concise PR notes (what changed, why, follow-ups, tests).

---

## Recommended immediate start (3 lanes)

- **Lane A:** YB-102 (Backend / Persistence Agent)
- **Lane B:** YB-101 (UX / Frontend Agent)
- **Lane C:** YB-302 (UX / Frontend Agent + Backend / Persistence Agent)

Then after YB-102 merges:

- YB-103
- YB-104
- YB-105

Integration / QA Agent should run after each major merge:

1. repo-wide regression checks
2. docs/runbook/current-state truth update
3. UX coherence check vs product principles
