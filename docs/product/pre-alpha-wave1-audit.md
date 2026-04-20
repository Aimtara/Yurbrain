# Pre-Alpha Hardening Wave 1 Audit (A1 + P1)

_Last updated: 2026-04-20_

This document closes the Wave 1 audit deliverables from the Pre-Alpha Hardening Board:

- **A1 — Audit hardcoded user assumptions**
- **P1 — Audit package boundary violations**

It is intentionally scoped to inventory + risk ranking + minimal remediation guidance.

---

## A1 — Hardcoded user assumptions audit

### Scope audited

- `apps/api`
- `apps/web`
- `apps/mobile`
- `packages/db`
- `packages/client`
- event routes/usages
- founder mode usage
- seed and test data assumptions

### A1 acceptance criteria status

- [x] all hardcoded user assumptions documented
- [x] main loop paths identified
- [x] minimal identity plan proposed

### Findings summary

The main product loop no longer relies on a single hardcoded demo user in runtime route handlers. The most important remaining assumptions are:

1. seed default user UUID (`11111111-1111-1111-1111-111111111111`)
2. client auto-identity generation/persistence (can diverge from seed user)
3. legacy identity fallback in API middleware (`userId` from query/params/body) for compatibility
4. test-only identity fixtures and fallback behavior

### A1 detailed findings

| Area | Location | Assumption | Classification | Main-loop impact | Risk |
| --- | --- | --- | --- | --- | --- |
| Seed data | `packages/db/src/scripts/seed.ts` | Default seed user id falls back to `11111111-1111-1111-1111-111111111111` when `YURBRAIN_SEED_USER_ID` is unset | Hardcoded literal ID (dev bootstrap) | Seeded capture/feed/task/session data is tied to this user | Medium |
| Client identity | `packages/client/src/api/client.ts` | If no configured/global/stored/env id exists, client generates `crypto.randomUUID()` and persists it | Implicit current-user assumption | Affects every client request (capture/feed/items/tasks/sessions/preferences) | High |
| Client identity | `packages/client/src/auth/current-user.ts` | Current-user resolution relies on global/local/env values | Implicit current-user assumption | Affects hooks and preference/session utilities | Medium |
| API middleware | `apps/api/src/middleware/current-user.ts` | Legacy fallback resolves `userId` from query/params/body when header/bearer is absent | Legacy compatibility path | Touches all authenticated routes that call `requireCurrentUser` | High |
| API middleware (test only) | `apps/api/src/middleware/current-user.ts` | In test mode (`NODE_ENV=test` or `YURBRAIN_TEST_MODE=1`), injects fallback user id and bypasses strict ownership via `canAccessUser` | Test-only assumption | Prevents broad test breakage; not intended for production | Medium |
| Event API surface | `apps/api/src/server.ts` | `/events` endpoint is blocked (`403`) until authenticated filtering is implemented | Intentional restriction | Keeps unsafe raw event access disabled | Low |
| Founder mode defaults | `apps/api/src/routes/preferences.ts`, `apps/web/src/features/shell/useAppShellState.ts`, `apps/mobile/src/features/shell/useMobileLoopController.ts` | Founder mode defaults to `false` and is persisted per current user/device state | Implicit preference default | Affects founder-mode rendering and capture metadata | Low |
| Documentation | `AGENTS.md`, `docs/dev/runbook.md` | Seeded user id is documented as the default local test identity | Dev docs assumption | Guides local setup and manual verification | Low |
| Tests | `apps/api/src/__tests__/**`, `packages/client/src/__tests__/**`, `e2e/full-loop.spec.ts` | Fixed UUID fixtures are used for deterministic test assertions | Test-only assumption | No production impact | Low |

### Main-loop path mapping (user identity)

- **Capture:** user-scoped in API, founder mode stamped from current user preference.
- **Feed:** ranked/listed per current user context.
- **Item detail + artifacts:** ownership checks gate read/update.
- **Tasks + sessions:** ownership checks gate create/read/update/start/pause/finish.
- **Founder mode data:** persisted via user preferences and read back by current user context.

### Minimal identity plan (next, still pre-alpha scope)

1. Keep `x-yurbrain-user-id` / bearer UUID as the request identity contract.
2. In production-like environments, remove or hard-disable legacy query/body/params `userId` fallback.
3. Keep test fallback behavior only under explicit test env conditions.
4. Align client bootstrap identity with configured environment identity for seeded local demos.
5. Remove optional `userId` request fields from contracts once compatibility window ends.

---

## P1 — Package boundary violations audit

### P1 acceptance criteria status

- [x] full list of major violations documented
- [x] violations ranked by risk/priority

### Scope and detection rule

This audit searched for imports that cross package boundaries using filesystem `/src` paths (for example: `.../packages/db/src`), with special focus on `apps/api -> packages/db/src`.

### Risk-ranked violations

#### High risk

1. **`apps/api/src/state.ts`** imports `../../../packages/db/src` (runtime and type imports).
   - Why high: app-layer depends on package internals by filesystem path instead of stable package boundary.
2. **`apps/api/src/services/ai/summarize.ts`**, **`apps/api/src/services/ai/shared.ts`**, **`apps/api/src/services/ai/item-query.ts`** import `../../../../../packages/ai/src`.
   - Why high: same boundary violation pattern and `apps/api/package.json` does not currently declare `@yurbrain/ai` dependency.

#### Medium risk

3. `apps/api` contracts imports via `.../packages/contracts/src` in route/service modules:
   - `apps/api/src/routes/ai.ts`
   - `apps/api/src/routes/brain-items.ts`
   - `apps/api/src/routes/capture.ts`
   - `apps/api/src/routes/convert.ts`
   - `apps/api/src/routes/feed.ts`
   - `apps/api/src/routes/messages.ts`
   - `apps/api/src/routes/preferences.ts`
   - `apps/api/src/routes/sessions.ts`
   - `apps/api/src/routes/tasks.ts`
   - `apps/api/src/routes/threads.ts`
   - `apps/api/src/services/capture/enrichment.ts`
   - `apps/api/src/services/tasks/convert.ts`
   - Why medium: inconsistent with package import style (`@yurbrain/contracts` already used elsewhere), increases fragility during package export/boundary cleanup.
4. **`e2e/full-loop.spec.ts`** imports `../apps/api/src/server`.
   - Why medium: test layer is coupled to app source layout.

#### Low risk

5. No material `/src` boundary violations were found in `apps/web` or `apps/mobile` against shared packages under current code.

### Grouped totals

- `apps/api -> packages/db/src`: **1 file** (2 import lines)
- `apps/api -> packages/ai/src`: **3 files**
- `apps/api -> packages/contracts/src`: **12 files**
- `e2e -> apps/api/src`: **1 file**

### Minimal entrypoint plan (for P2/P3 execution)

1. Replace `apps/api -> packages/db/src` with `@yurbrain/db`.
2. Add `@yurbrain/ai` to `apps/api` dependencies and replace `/packages/ai/src` imports with `@yurbrain/ai`.
3. Replace all `packages/contracts/src` imports in `apps/api` with `@yurbrain/contracts`.
4. Introduce a stable test harness export for e2e to avoid direct `apps/api/src/server` coupling.

---

## Wave 1 completion note

With this document, Wave 1 audit deliverables (**A1 + P1**) are complete as documented artifacts.
Implementation waves that follow (A2+, E1+, P2+) remain separate execution workstreams.
