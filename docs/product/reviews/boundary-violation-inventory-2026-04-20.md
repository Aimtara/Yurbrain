# Yurbrain Boundary Violation Inventory and Risk Ranking

_Date: April 20, 2026 (UTC)_

## Objective

Document where trust boundaries are currently violated or weakly enforced, rank each risk, and propose a remediation order for production hardening.

## Scope and method

This review was done as a static audit of API middleware/routes, client identity plumbing, contracts, and operational defaults that influence tenant isolation.

Boundary categories used:

1. **Identity boundary** (who is the caller?)
2. **Authorization boundary** (what can that caller access?)
3. **Transport/perimeter boundary** (who can call from where?)
4. **Contract boundary** (do shared schemas encourage safe ownership semantics?)

Risk score model:

- **Likelihood (1–5)**
- **Impact (1–5)**
- **Risk score = Likelihood × Impact**

### Rating legend

- **Critical:** 20–25
- **High:** 12–19
- **Medium:** 6–11
- **Low:** 1–5

## Inventory (ranked)

| Rank | Boundary violation | Evidence | Likelihood | Impact | Score | Severity |
|---|---|---|---:|---:|---:|---|
| 1 | **Identity is self-asserted (no credential verification).** API accepts user identity directly from `x-yurbrain-user-id` or `Authorization: Bearer <uuid>` and treats UUID format as sufficient proof. | `resolveFromHeaders` + `requireCurrentUser` accept parsed UUIDs without token/session verification. | 5 | 5 | 25 | **Critical** |
| 2 | **Legacy identity ingestion paths still trusted** (`query.userId`, `params.userId`, `body.userId`). This extends spoofing paths beyond headers. | `resolveLegacyFallback` accepts and returns identity from query/params/body. | 5 | 4 | 20 | **Critical** |
| 3 | **CORS fallback allows wildcard origin while credentials are enabled.** This is a perimeter anti-pattern and weakens browser boundary assumptions. | `Access-Control-Allow-Origin` can resolve to `*`, while `Access-Control-Allow-Credentials` is always `true`. | 4 | 4 | 16 | **High** |
| 4 | **Contracts keep optional `userId` on write/query requests** even though server mostly scopes from current user. This creates a latent boundary smell and future regression risk. | Multiple request schemas include optional `userId` fields (`CreateBrainItem`, `CreateTask`, `ListTasks`, `AiConvert`, etc.). | 4 | 3 | 12 | **High** |
| 5 | **Client identity is generated/stored client-side and sent as authority.** Client can set env/global/localStorage user ID and API trusts it. | `ensureCurrentUserId` reads env/storage/global or generates UUID; request header is set from that value. | 4 | 3 | 12 | **High** |
| 6 | **Dual-route preference API (`/me` + `/:userId`) keeps user-addressable path surface alive.** `canAccessUser` helps, but route shape increases future bypass risk and complexity. | `/preferences/:userId` remains active with access check; `/preferences/me` also exists. | 3 | 3 | 9 | **Medium** |
| 7 | **Test fallback identity path exists in runtime code path.** If test mode flags are mis-set, identity checks can silently degrade. | `requireCurrentUser` returns `test_fallback` user when `NODE_ENV=test` or `YURBRAIN_TEST_MODE=1`. | 2 | 4 | 8 | **Medium** |

## Detailed findings

### 1) Identity proof is missing (Critical)

The current middleware enforces UUID shape but not identity authenticity. Any caller that knows or guesses another UUID can impersonate that user and pass authorization checks because ownership checks are based on the same asserted ID.

**Why this is the top risk:** all downstream authorization logic depends on this trust root.

### 2) Legacy userId fallbacks are still active (Critical)

Even if header standards exist, current behavior still accepts user identity from query params, route params, and request body. This broadens accidental and intentional impersonation avenues (e.g., logs, URLs, replay, SDK misuse).

### 3) CORS wildcard + credentials (High)

The server currently permits wildcard origin fallback and always sets credential support. This does not create auth by itself, but it is a weak perimeter posture and increases cross-origin risk/confusion when real auth cookies/tokens are introduced.

### 4) Contract-level ownership ambiguity (High)

Schemas still expose optional `userId` on requests where ownership should be server-derived from authenticated principal. While many routes currently ignore payload `userId`, keeping it in canonical contracts encourages boundary drift and makes future regressions more likely.

### 5) Client-generated identity as authority (High)

Client code intentionally resolves current user from storage/env/global state (or runtime UUID generation), then sends it in request headers. In absence of verifiable credentials, this is equivalent to caller-chosen identity.

### 6) Coexistence of `/me` and `/:userId` preference routes (Medium)

Authorization checks exist, so this is not currently a direct bypass. However, a user-addressable route for user-scoped preferences increases endpoint surface and future bug probability versus a pure `/me` model.

### 7) Test fallback branch in shared middleware (Medium)

The fallback path is appropriate for tests but lives in the same runtime middleware. Misconfiguration of env flags can weaken identity guarantees outside intended contexts.

## Existing compensating controls

- Most entity routes now scope reads/writes by `currentUser.id` and verify ownership via `canAccessUser` on fetched resources.
- `/events` is intentionally disabled pending proper auth + user filtering.
- Legacy source usage emits warning logs (`legacy_user_identity_resolution`) for observability.

These controls reduce accidental cross-user access but do **not** eliminate spoofing when identity itself is caller-controlled.

## Remediation priority (execution order)

### P0 (blocker before external alpha)

1. Replace UUID-as-identity with verifiable auth (signed JWT/session) and validate issuer/audience/expiry.
2. Delete legacy identity fallbacks (query/params/body) in middleware.
3. Make server principal authoritative; reject any client-supplied `userId` ownership on protected routes.

### P1

4. Remove optional `userId` from external request contracts where ownership must come from auth context.
5. Deprecate `/:userId` preference endpoints and keep `/preferences/me` only.
6. Tighten CORS to explicit allowlist per environment; avoid wildcard fallback.

### P2

7. Move test fallback behavior behind test-only build/runtime guardrails to prevent accidental non-test activation.
8. Add dedicated boundary tests: spoofed header, legacy-query identity rejection, cross-user access denial, and CORS policy assertions.

## Verification checklist for closure

- [ ] Requests without valid auth token return `401` regardless of `x-yurbrain-user-id`/payload `userId`.
- [ ] Query/param/body identity sources are removed from accepted surface.
- [ ] Contracts no longer expose `userId` for caller-controlled ownership where not needed.
- [ ] `/preferences/:userId` removed or hard-deprecated behind internal-only guard.
- [ ] CORS policy is explicit per environment and validated in tests.
- [ ] Security regression tests run in CI for boundary abuse scenarios.

## Evidence index

- `apps/api/src/middleware/current-user.ts`
- `apps/api/src/server.ts`
- `apps/api/src/routes/preferences.ts`
- `packages/contracts/src/api/api-contracts.ts`
- `packages/client/src/api/client.ts`
