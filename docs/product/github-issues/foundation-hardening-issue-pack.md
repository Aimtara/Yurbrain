# Foundation Hardening — GitHub Issue Pack (16 Tickets)

_Copy/paste-ready issue set._

## EPIC 1 — Auth & Current User Foundation

### A1 — [Auth] Audit hardcoded demo-user assumptions across repo

**Objective**
Identify all places where the system relies on a hardcoded demo user.

**Scope**
- apps/api
- apps/web
- apps/mobile
- packages/db
- packages/client
- events
- founder mode
- seed/mock data

**Tasks**
- Find all hardcoded user IDs
- Identify implicit “current user” assumptions
- Map which product flows depend on them
- Categorize impact:
  - core loop critical
  - non-critical / dev-only
- Propose minimal identity model

**Deliverable**
- Document listing:
  - locations of hardcoded user usage
  - impact level
  - replacement approach

**Acceptance Criteria**
- All major hardcoded user usages identified
- Minimal identity implementation plan proposed

---

### A2 — [Auth] Implement backend current-user request context

**Objective**
Introduce a minimal authenticated user context in backend/API.

**Tasks**
- Add request-level user resolution
- Create current-user middleware/context
- Replace demo-user usage in API paths
- Ensure services can access user identity

**Constraints**
- No full auth system
- No profile system
- No roles/permissions system

**Acceptance Criteria**
- API routes no longer depend on demo user
- Request has consistent current-user context
- Core services operate on authenticated user

---

### A3 — [Auth] Replace hardcoded user usage in web and mobile clients

**Objective**
Remove demo-user assumptions from client apps.

**Tasks**
- Replace hardcoded user ID usage
- Wire API calls to authenticated context
- Ensure app bootstraps with current user
- Validate feed, capture, item detail still work

**Acceptance Criteria**
- No hardcoded user IDs in web/mobile
- Core loop works under real user context

---

### A4 — [Auth] Ensure all core data is properly user-scoped

**Objective**
Guarantee all data access is scoped to current user.

**Tasks**
- Audit DB queries and repository layer
- Validate:
  - items
  - feed
  - events
  - tasks
  - sessions
- Add tests for cross-user leakage

**Acceptance Criteria**
- No cross-user data access in core flows
- Tests validate user isolation

## EPIC 2 — Event Access Control

### E1 — [Events] Define event access and exposure policy

**Objective**
Define safe usage model for events.

**Define**
- server-only events
- user-readable events
- derived-only events
- restricted endpoints

**Deliverable**
- policy doc:
  - what can be exposed
  - what must stay server-side
  - how Founder Review consumes events

**Acceptance Criteria**
- Clear event access model defined
- No ambiguity about raw vs derived access

---

### E2 — [Events] Implement user-scoped event filtering

**Objective**
Ensure events are filtered by current user.

**Tasks**
- Add user-based filtering to event queries
- Enforce access control in API routes
- Preserve 403 for unsafe endpoints

**Acceptance Criteria**
- Events cannot be accessed across users
- Raw event access is controlled or blocked

---

### E3 — [Events] Power Founder Review via server-side summaries

**Objective**
Move analytics and scoring server-side.

**Tasks**
- Compute metrics server-side
- Return derived summaries only
- Remove client reliance on raw events

**Acceptance Criteria**
- Founder Review does not depend on raw client event access
- Event exposure surface minimized

---

### E4 — [Events] Add tests and docs for event access model

**Objective**
Ensure event access rules are enforced and understood.

**Tasks**
- Add tests for user scoping
- Document event access rules

**Acceptance Criteria**
- Tests pass
- Docs clearly describe event usage model

## EPIC 3 — Package Boundary Cleanup

### P1 — [Monorepo] Audit package boundary violations

**Objective**
Identify all direct imports into package `src` internals.

**Focus**
- apps/api → packages/db/src
- similar patterns across repo

**Deliverable**
- list of violations
- risk ranking

**Acceptance Criteria**
- all major violations documented

---

### P2 — [Monorepo] Define minimal package entrypoints

**Objective**
Create proper package public surfaces.

**Tasks**
- define `index.ts` exports
- limit scope to required APIs

**Acceptance Criteria**
- packages expose stable entrypoints
- no unnecessary export sprawl

---

### P3 — [Monorepo] Replace high-risk boundary violations

**Objective**
Remove direct `src` imports in critical paths.

**Tasks**
- update imports to use entrypoints
- validate runtime stability

**Acceptance Criteria**
- critical violations removed
- no regressions

---

### P4 — [Monorepo] Document package boundaries and finalize cleanup

**Objective**
Document and stabilize package usage.

**Tasks**
- write import guidelines
- list remaining deferred violations

**Acceptance Criteria**
- clear package usage rules exist

## EPIC 4 — Real LLM Thin Slice

### L1 — [AI] Add production LLM provider integration foundation

**Objective**
Add provider abstraction/config for real LLM usage.

**Tasks**
- integrate provider (OpenAI, etc.)
- add config/env support
- preserve deterministic fallback

**Acceptance Criteria**
- provider path exists
- no behavior change yet

---

### L2 — [AI] Upgrade Summarize Progress to real LLM

**Objective**
Use real LLM for summaries.

**Tasks**
- connect provider to summary flow
- preserve fallback

**Acceptance Criteria**
- summaries use LLM when available
- fallback still works

---

### L3 — [AI] Upgrade What Should I Do Next to real LLM

**Objective**
Use real LLM for next-step suggestions.

**Acceptance Criteria**
- LLM produces concise actionable steps
- fallback still works

---

### L4 — [AI] Add safety, logging, and failure handling

**Objective**
Harden LLM usage.

**Tasks**
- add timeouts
- add logging
- add fallback handling

**Acceptance Criteria**
- safe and stable LLM usage

## Immediate execution order

1. Create A1, E1, P1 issues.
2. Run the Cursor prompts for A1, E1, P1.
3. Review outputs and choose:
   - minimal identity model
   - event exposure model
   - package cleanup scope
