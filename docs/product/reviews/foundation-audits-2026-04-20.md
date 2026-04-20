# Foundation Audits (A1, E1, P1)

_Date: 2026-04-20_

This document contains the requested audit outputs for tickets A1, E1, and P1.

## A1 — Auth audit (hardcoded demo-user assumptions)

### 1) Locations found

#### Hardcoded user IDs

- `apps/web/src/features/shell/constants.ts`
  - Exports fixed `userId = "11111111-1111-1111-1111-111111111111"` used broadly by web controllers.
- `apps/mobile/src/features/shared/constants.ts`
  - Exports fixed `demoUserId = "11111111-1111-1111-1111-111111111111"`.
- `apps/api/src/routes/founder-review.ts`
  - Fallback to fixed default user when query omits `userId`.
- `apps/api/src/services/founder-review/types.ts`
  - Exports `founderReviewDefaultUserId` constant.
- `apps/api/src/services/founder-review/mock-signals.ts`
  - Uses seeded user constant for mock signal derivation.
- `packages/db/src/scripts/seed.ts`
  - Seeds default user id (env-overridable, but still defaulted to demo UUID).

#### Implicit “current user” assumptions

- API routes rely on `userId` query/body parameters instead of request auth context.
  - Examples: brain items, feed, tasks, sessions, founder-review, preferences.
- Web/mobile clients inject a single static user into all calls.
- Founder Review can run with default user without explicit caller identity.

### 2) Assumption description

- The system currently models identity as “caller-supplied userId string,” not “resolved current user context.”
- Client apps assume exactly one user exists.
- Several backend flows are functionally user-scoped but trust unverified user IDs from request payload/query.

### 3) Impact on product loop

#### Core-loop critical

- Feed loading and generation.
- Capture/create brain item.
- Task conversion and session listing.
- Founder Review analytics context.

#### Non-critical / dev-only

- Seed script fixed default user ID (acceptable in dev with env override).
- Some founder-review mock-signal constants used for deterministic UX copy.

### 4) Minimal identity model recommendation

- Add request middleware that resolves `currentUserId` from one temporary source (e.g., `x-yurbrain-user-id` header) with strict UUID validation.
- Store on request context (`request.currentUser`).
- Remove `userId` from public query usage for user-owned endpoints where feasible; derive from context server-side.
- Keep explicit userId only for internal tooling/test harness routes (if needed) and gate behind test/dev checks.
- Keep seed default ID for dev bootstrap, but isolate as non-production path.

## E1 — Event policy audit

### Current system observations

#### Storage

- Events are persisted in `events` table with fields:
  - `id`, `user_id`, `event_type`, `payload`, `occurred_at`.
- Current event types are narrow (`brain_item_created`, `brain_item_updated`).

#### Access and API exposure

- `/events` route exists but intentionally returns `403` with explicit message that auth/per-user filtering is not implemented yet.
- Events are appended from brain-item and capture routes.
- Founder Review endpoint reads user-scoped model output but currently permits caller-supplied user id and has a demo-user fallback.

### Recommended event access policy

#### Server-only events

- Raw event payloads (`events.payload`) and internal event logs.
- Any future events containing model prompts, scoring internals, or operational metadata.

#### User-readable events (strictly scoped)

- Minimal, sanitized event timeline entries only when explicitly required by product UX.
- Must be filtered by `currentUserId` server-side and avoid internal payload fields.

#### Derived-only events

- Founder Review metrics, score bands, trend deltas, and “what changed” narratives.
- Any analytics synthesis should be computed server-side and returned as DTO summaries, not raw event records.

### Security risks in current design

- If `/events` is re-enabled without auth context, cross-user leakage risk is high.
- Caller-supplied `userId` in founder-review query enables identity spoofing risk.
- Raw payload exposure may leak future sensitive metadata.

### Founder Review access model recommendation

- Founder Review requests must use resolved `currentUserId` only.
- API returns derived summaries and action suggestions only.
- No raw event list in client contract.
- Add tests for user isolation + unauthorized access behavior.

## P1 — Package boundary audit

### 1) Violations found (imports into package `src` internals)

#### `packages/db/src`

- `apps/api/src/state.ts`
- `apps/api/src/services/founder-review/ai-wording.ts` (types)
- `apps/api/src/services/founder-review/service.ts` (types)

#### `packages/contracts/src`

- `apps/api/src/routes/*` and service files (multiple)
- `apps/web/src/features/founder-review/types.ts`

#### `packages/ai/src`

- `apps/api/src/services/ai/item-query.ts`
- `apps/api/src/services/ai/summarize.ts`
- `apps/api/src/services/ai/shared.ts`

### 2) Grouping by risk

#### High risk

- Runtime dependency on `packages/db/src` from API core state/bootstrap.
  - Breaks encapsulation of persistence boundary and increases refactor fragility.

#### Medium risk

- Runtime dependency on `packages/ai/src` from API services.
  - Ties API behavior to package internals and non-stable module layout.

#### Low-to-medium risk

- `packages/contracts/src` imports.
  - Less operational risk (contracts are intentionally shared), but still bypasses explicit package surface.

### 3) Minimal entrypoints needed

- `@yurbrain/db`
  - Export `createDbRepository`, `DbRepository`, repository record/types, and any required options via package root.
- `@yurbrain/contracts`
  - Export all public request/response schemas and domain types from root entrypoint.
- `@yurbrain/ai`
  - Export `encodeGroundedAiContext` and AI helper types from root entrypoint.

### 4) Prioritized fix plan

1. Introduce package-root exports for db + ai + contracts.
2. Replace high-risk imports (`db/src`) first.
3. Replace `ai/src` imports next.
4. Replace `contracts/src` imports and enforce lint/CI rule blocking new `packages/*/src` imports.
