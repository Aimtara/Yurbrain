# Yurbrain AI Agent Execution Guide

## Objective
Turn the current Yurbrain repository from a prototype into a persistent, usable MVP that proves the core loop:

**Capture → Resurface → Interact → Convert → Act → Return**

This guide is written for an implementation agent and is intended to be followed directly.

## Mission Definition

### Primary goal
By the end of execution, a single user must be able to:
- create a brain item
- return later and see resurfaced feed cards
- open an item and interact with it
- comment or ask AI about it
- convert it into a task
- start and finish a session
- leave and return later with data preserved

### Success criteria
Work is successful only if all of the following are true:
- no critical runtime state depends on in-memory maps
- the main loop is backed by persistent storage
- at least one client surface provides a coherent end-to-end flow
- contracts remain authoritative and are not bypassed
- the app can be seeded, reset, and run locally
- there is a truthful current-state doc and runbook

### Constraints
Do not do the following unless explicitly required:
- do not add new domain objects
- do not redesign the product vision
- do not implement future-phase features
- do not broaden scope beyond the core MVP loop
- do not replace frozen contracts casually
- do not optimize for polish over coherence
- do not prioritize advanced AI over persistence and loop completion

### Source of truth
Treat these as authoritative:
- `packages/contracts/*`
- `docs/architecture/*`
- `docs/product/agent-task-pack.md`

If implementation conflicts with docs:
1. inspect code
2. identify mismatch
3. document mismatch in `docs/product/current-state.md`
4. choose the simplest implementation consistent with MVP architecture

## Execution priority order
Work in this order. Do not skip ahead:
1. establish truth of current repo state
2. eliminate in-memory persistence
3. make backend fully DB-backed
4. add seed/reset/run reliability
5. complete one real client flow
6. strengthen feed contract and UX coherence
7. tighten AI usefulness
8. prepare for roadmap scaling

## Phase 1 — Establish Ground Truth

### Task 1: Create current-state document
Create or update `docs/product/current-state.md` with:
- what is fully implemented
- what is partially implemented
- what is placeholder or mocked
- what is not wired through persistence
- what is missing from the core MVP loop
- known technical debt
- next milestone

This document must be factual, not aspirational.

### Task 2: Verify local execution
Create or update `docs/dev/runbook.md`.

Verify and document exact commands/failures for:
- dependency install
- API boot
- web boot
- mobile boot (if present)
- test command behavior
- migration flow
- seed flow

If something does not run, fix it before moving on unless blocked by missing secrets or external credentials.

## Phase 2 — Replace Fake Runtime with Real Persistence

### Task 3: Audit in-memory state
Search the repo for:
- `new Map(`
- array-backed temp stores
- local singleton stores
- mock persistence in service modules

Produce a list of all in-memory state locations and replace them systematically.

### Task 4: Implement repository layer
Use `packages/db` as the persistence boundary.

Create or complete repository modules for:
- brain items
- threads
- messages
- feed cards
- tasks
- sessions
- events
- AI artifacts (if applicable)

Each repository should support only MVP-needed operations:
- create
- get by id
- list by parent or user
- update
- soft delete/archive only if already part of contracts

Do not add speculative methods.

### Task 5: Replace service-layer in-memory logic
Refactor API services to use repositories instead of runtime maps.

Priority routes:
- brain items
- feed
- threads/messages
- tasks
- sessions
- AI artifact persistence

All route handlers must read/write durable records.

### Task 6: Validate schema and migrations
Ensure DB schema matches runtime needs.

The agent must:
- inspect migrations
- ensure required tables exist
- ensure required indexes exist
- verify foreign keys or logical relationships
- remove future-phase tables only if they create confusion or break flow

Then verify:
- fresh setup works
- migrations run cleanly
- app boots against migrated DB

## Phase 3 — Seed, Reset, and Dev Reliability

### Task 7: Add seed script
Create a seed path that produces a realistic single-user MVP dataset.

Minimum seed data:
- 1 user
- 10–20 brain items
- 5–10 feed cards
- 2+ threads
- 3+ tasks
- 1–2 completed sessions
- at least 1 item with comment history
- at least 1 item with AI artifact history

Seed data should be useful for manual QA.

### Task 8: Add reset script
Provide reliable dev reset flow:
- wipe DB
- rerun migrations
- reseed

Document exact commands.

### Task 9: Normalize dev commands
Ensure root-level commands exist/work consistently for:
- install
- migrate
- seed
- reset
- dev api
- dev web
- dev mobile (if applicable)
- test

Do not leave startup dependent on tribal knowledge.

## Phase 4 — Complete One Real User Flow

### Task 10: Choose primary UX surface
Use this rule:
- web = fastest implementation workbench
- mobile = target product direction

Prioritize whichever surface can deliver the full loop fastest (usually web).
Do not try to perfect both at once.

### Task 11: Implement core loop UI
Flow must be usable:
- Capture: user can create a brain item.
- Focus Feed: user can see resurfaced cards tied to persisted data.
- Brain Item Detail: user can open item and see raw content, related comment/chat history, quick actions.
- Interaction: user can add a comment and ask AI.
- Conversion: user can convert an item or message into a task.
- Action: user can start and finish a session from a task.
- Return Later: after restart/refresh, state remains.

If any fail, the loop is not complete.

## Phase 5 — Tighten Feed Semantics

### Task 12: Normalize feed card contract
Feed card render contract should support UI with minimum fields:
- id
- source item/task linkage
- card type
- title
- preview/body text
- lens
- whyShown
- available actions
- state flags
- timestamps

If current feed contract is too thin, expand carefully without breaking architecture.

### Task 13: Improve feed meaningfulness
Feed must not behave like a random list.

Implement/refine:
- deterministic ranking
- simple diversity control
- visibility rules
- dismissal
- snoozing
- why-shown explanations

Avoid overcomplication; MVP quality > cleverness.

## Phase 6 — Tighten AI Usefulness

### Task 14: Improve AI output quality
Judge AI endpoints by usefulness, not existence.

Prioritize:
- summarize
- item chat
- task conversion

For each:
- preserve grounding
- return structured outputs
- handle low-confidence/empty results
- persist useful artifacts where appropriate

Do not add advanced multi-agent orchestration.

### Task 15: Add fallback behavior
Every AI-assisted flow must degrade gracefully.

If AI fails:
- UI must not dead-end
- user must still be able to comment manually
- user must still be able to create task manually where appropriate

## Phase 7 — QA, Cleanup, and Handoff

### Task 16: End-to-end manual QA
Validate this scenario:
- create item
- refresh app
- see feed card
- open item
- add comment
- ask AI question
- convert to task
- start session
- finish session
- refresh and confirm continuity

Document failures and fix them.

### Task 17: Cleanup pass
- remove dead code
- reduce duplication
- clean imports
- enforce package boundaries
- document any remaining intentional shortcuts

### Task 18: Final state update
Update:
- `docs/product/current-state.md`
- `docs/dev/runbook.md`

Both must reflect actual results.

## Deliverables required at completion

### Backend
- DB-backed services
- no critical in-memory state
- working migrations
- seed/reset flow

### Client
- at least one full usable loop
- persistent user flow

### Docs
- current-state doc
- runbook
- truthful implementation status

### Product
- coherent MVP loop
- not just endpoints, not just stubs

## Definition of done
Mission complete only when:
- one user can complete full loop end-to-end
- persistence is real
- docs are accurate
- local setup is reproducible
- no critical flow depends on fake runtime storage

## Escalation rules for the agent
Stop and surface a blocker only if:
- a frozen contract must change
- a missing secret/credential blocks work
- repo has conflicting architectures that cannot be resolved safely
- migrations would destroy needed data without approval

Otherwise, continue and choose the simplest implementation consistent with MVP.
