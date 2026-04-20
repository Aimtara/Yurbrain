# Event Access Policy (E1) — Pre-Alpha

_Last updated: 2026-04-20_

## Purpose

Define a minimal, enforceable event access model for pre-alpha so Founder Review and future analytics can be built safely without broad raw-event exposure.

---

## Current state (factual)

- Event writes exist through API services (for example `brain_item_created`, `brain_item_updated`) and are persisted with `userId`.
- Public event read endpoint (`GET /events`) is intentionally disabled with `403` until authenticated filtering is implemented.
- Founder-facing surfaces currently rely on deterministic derived summaries from domain entities (tasks/sessions/feed) rather than raw event streaming.

---

## Event data classes

### 1) Server-only raw events

Raw append-only event records are server-internal by default.

Examples:
- low-level state transitions
- audit/event payload internals
- any event data that could reveal sensitive behavioral traces

Policy:
- **Never exposed directly as unfiltered global streams**
- Access only by backend services and internal tooling

### 2) User-readable scoped events (narrow)

A small subset of event-derived data may be user-readable if:
- it is authenticated
- it is strictly `currentUser.id`-scoped
- it is needed for product continuity

Policy:
- Prefer derived APIs over raw-event APIs.
- If direct reads are introduced later, return only user-scoped slices with strict schemas.

### 3) Derived-summary only data

Founder Review, insight cards, and behavioral summaries should be computed server-side and returned as derived aggregates.

Policy:
- Clients receive summary-level outputs, not broad raw event payloads.
- Aggregations must be scoped to authenticated user identity.

### 4) Intentionally restricted/blocked surfaces

Any route that would expose raw cross-user or ambiguous event data remains blocked until explicit auth + filtering rules are implemented.

Policy:
- Keep `403` behavior for unsafe routes until replacement exists.

---

## Access rules

### Authentication and scoping

1. Every event-adjacent read/write path must resolve authenticated `currentUser`.
2. Event writes must include and persist `userId = currentUser.id`.
3. Event reads/derivations must filter by `currentUser.id` before response construction.

### Cross-user isolation

- Cross-user event visibility is forbidden on pre-alpha main paths.
- Any attempted access to another user's event-derived surface should return `404`/`403` depending on route semantics.

### Legacy compatibility

- Legacy identity fallback paths are temporary and should be removed/hardened before open alpha.
- Event access logic must not depend on unauthenticated query/body user identifiers.

---

## Founder Review model (pre-alpha)

Founder Review must be powered by server-side derived summaries computed from user-scoped domain data and/or event data.

Required behavior:
- no broad client-side event inspection
- no unscoped raw event browsing
- deterministic, explainable summary outputs per authenticated user

---

## Risk register (current)

1. **Legacy identity fallback risk**  
   If route identity can be inferred from body/query fallback in non-test contexts, event scoping may be easier to misuse.

2. **Raw-event route reintroduction risk**  
   Re-enabling `/events` without strict filtering would create immediate cross-user exposure risk.

3. **Client overreach risk**  
   Building Founder Review via client-side raw-event fetches would leak unnecessary raw data and increase security complexity.

---

## Pre-alpha enforcement checklist

- [x] Unsafe global event route is blocked (`/events` returns `403`).
- [x] Event writes in core loop carry user ownership.
- [x] Founder-facing insight surfaces can be implemented from derived summaries instead of raw streams.
- [ ] Authenticated event filtering route(s) implemented (E2).
- [ ] Event access tests and docs expanded with concrete route-level assertions (E4).

---

## Next implementation steps

1. Implement E2: authenticated event filtering for any new event-read routes.
2. Add explicit tests for event scoping and forbidden cross-user access.
3. Keep `/events` blocked until E2-compliant replacement surface is live.
