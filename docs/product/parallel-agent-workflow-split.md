# Parallel Agent Workflow Split

This workflow outlines how to split Yurbrain implementation across agents in parallel while minimizing conflicts.

## Agent A — Backend Persistence Agent

### Ownership
- `apps/api`
- `packages/db`
- migrations
- seed/reset
- repository layer

### Responsibilities
- Eliminate in-memory state.
- Complete DB-backed repositories.
- Refactor services/routes.
- Ensure migrations and seed work.
- Keep API behavior stable.

### Inputs
- contracts
- architecture docs
- current API routes

### Outputs
- persistent backend
- updated migrations
- seed/reset scripts
- backend validation summary

### Must not do
- major UI work
- product redesign
- contract redesign unless blocked

## Agent B — Frontend Loop Agent

### Ownership
- `apps/web`
- optionally `apps/mobile` shell
- client integration
- loop UX

### Responsibilities
- Complete the MVP loop on the main client surface.
- Wire capture/feed/item/task/session to the real backend.
- Handle loading/error states.
- Ensure refresh continuity.

### Inputs
- contracts
- `packages/client`
- `packages/ui`
- backend endpoints

### Outputs
- usable end-to-end loop
- coherent screens
- basic QA notes

### Must not do
- invent new backend contracts
- add future-phase features
- optimize visuals over functionality

## Agent C — AI Behavior Agent

### Ownership
- `packages/ai`
- AI-related API services
- AI prompt logic
- output quality tuning

### Responsibilities
- Tighten summarize.
- Tighten item chat.
- Tighten task conversion.
- Improve fallbacks.
- Maintain contract compliance.

### Inputs
- contracts
- backend persistence
- user loop context

### Outputs
- improved AI outputs
- fallback behavior
- quality notes and examples

### Must not do
- invent new product systems
- broaden into advanced memory graph intelligence yet

## Agent D — Documentation / Integration Agent

### Ownership
- `docs/*`
- runbook
- current-state doc
- milestone tracking
- integration sanity

### Responsibilities
- Keep docs truthful.
- Reconcile implementation with architecture.
- Document blockers.
- Maintain execution clarity for humans + agents.

### Outputs
- `current-state.md`
- `runbook.md`
- implementation status updates
- milestone review notes

## Recommended Execution Order

### Parallel Start
Run first in parallel:
- Agent A: persistence + DB
- Agent D: current-state + runbook audit

### Second Wave
After Agent A is stable:
- Agent B starts full loop wiring
- Agent C starts AI tightening against stable routes

### Final Integration
- Agent D reconciles truth
- Agent B + A run full-loop QA
- Agent C verifies AI quality inside loop

## Coordination Rules Between Agents

### Shared rules
- contracts are authoritative
- do not silently change shared types
- if a contract must change, document it clearly
- avoid broad refactors outside owned area
- keep commits/task outputs small and reviewable

### Handoff expectations
- Agent A hands stable endpoints to Agent B.
- Agent B reports missing endpoint behavior back to Agent A.
- Agent C only tunes AI after Agent A confirms persistence path.
- Agent D updates docs after each integration milestone.
