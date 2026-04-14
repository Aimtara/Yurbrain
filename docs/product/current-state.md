# Yurbrain Current Implementation State

_Last audited: April 14, 2026 (UTC)._

This document reflects the **observed implementation state** in the repository right now.

## Classification legend

- **Implemented**: code path exists and is exercised by tests/builds.
- **Partial**: code exists, but has notable limitations (non-persistent, placeholder UX, or incomplete execution path).
- **Stubbed/Mocked**: intentionally placeholder behavior.

## Monorepo / root scripts

### Implemented
- Workspace layout is active via `pnpm-workspace.yaml` and Turbo (`apps/*`, `packages/*`).
- Root scripts exist for `dev:api`, `dev:web`, `dev:mobile`, `test`, `lint`, and `build`.
- `pnpm test` runs successfully through Turbo across packages that define `test` scripts.
- `pnpm build` runs successfully (web build is active).

### Partial
- Root `lint` currently only executes in packages that define a `lint` script (practically `apps/api`), so lint coverage is not monorepo-wide.
- README still instructs `node --test e2e/full-loop.spec.ts`, which does not execute `.ts` directly in current setup.

## apps/api

### Implemented
- Fastify server and route registration for:
  - brain items (`/brain-items` CRUD subset),
  - threads/messages,
  - feed ranking/actions,
  - AI summarize/classify/query,
  - task creation/update/list + manual convert + AI convert,
  - session lifecycle (start/pause/finish).
- Zod request validation and error envelope middleware.
- Correlation/request headers + request completion logging middleware.
- Test coverage across sprint suites (`sprint2` through `sprint6`) passes.

### Partial
- **Persistence is in-memory only** via `createState()` maps/arrays in `apps/api/src/state.ts`.
- API behavior resets on process restart.
- `/events` endpoint is present but intentionally disabled (returns 403).
- Feed generation is deterministic prototype logic (derived from stored in-memory items/cards), not backed by persisted ranking data.

### Stubbed/Mocked
- AI behavior includes deterministic fallback paths for timeout/invalid model outputs.
- `/ai/feed/generate-card` returns placeholder-style generated card content when title/body omitted.

## apps/web

### Implemented
- Next.js app compiles and builds.
- Page uses shared client/UI packages and wires feed + AI actions + chat and retry/error states.

### Partial
- Uses a hardcoded demo user and demo item IDs.
- UX is prototype-level and not tied to auth, real session continuity, or durable state.
- API requests use relative endpoints; correct behavior depends on local runtime/proxy setup.

## apps/mobile

### Implemented
- Expo entry app renders tab shell + capture field + feed preview attempt.

### Partial
- Feed preview call is a best-effort request with fallback text; no robust API base-url/config layer here.
- No automated tests configured in package scripts.
- UI is scaffold/prototype level.

## packages/contracts

### Implemented
- Domain/API schemas exported and used by API route validation and response shaping.
- Enum tests pass.

## packages/db

### Implemented
- Drizzle schema defines domain tables/enums for items, artifacts, threads, messages, feed cards, tasks, sessions, events, preferences.
- SQL migrations exist (`0000`–`0003`).

### Partial
- Schema/migrations are **not wired into runtime API persistence**.
- `db:migrate` requires a reachable Postgres instance and fails in a default environment without it.

### Stubbed/Mocked
- No seed/reset scripts exist yet in this package or at root.

## packages/client

### Implemented
- Typed fetch helpers and endpoint wrappers for core API routes.

### Partial
- Base URL strategy is minimal (`fetch(path)`), so environment-specific API host wiring is left to app runtime.
- Package test script is currently a placeholder echo.

## packages/ui

### Implemented
- Shared UI components/tokens/hooks exist and are imported by web app.

### Partial
- No package-level automated tests in script.
- Components are functional but still prototype-level in behavior/UX fidelity.

## packages/ai

### Implemented
- AI task runner/validation/fallback helper functions are present and used by API services.

### Partial
- Package test script is placeholder echo (no dedicated assertions in this package script).

## Test setup and execution state

### Implemented and passing
- `pnpm --filter api test`
- `pnpm --filter @yurbrain/contracts test`
- `pnpm test` (Turbo)
- `pnpm build`
- `pnpm --filter api exec tsx --test ../../e2e/full-loop.spec.ts`

### Failing / notable gaps
- `node --test e2e/full-loop.spec.ts` fails because Node does not run `.ts` tests directly in current setup.
- `pnpm --filter @yurbrain/db db:migrate` fails without an accessible Postgres instance.

## Migrations, seed, and reset flow

### Migrations
- SQL migrations are present and additive.
- Drizzle config points to `DATABASE_URL` or defaults to local Postgres on `localhost:5432/yurbrain`.

### Seed/reset
- No first-class `seed` or `reset` scripts were found at root or in `packages/db`.
- Current API tests rely on in-process in-memory state and Fastify `app.inject`, not database fixtures.

## Concise finding summary

1. **Most route contracts and service paths are implemented and tested.**
2. **Runtime persistence is still in-memory** (core limitation).
3. **DB schema/migrations exist but are not integrated into API runtime.**
4. **Web/mobile are functional prototype shells, not production-grade clients.**
5. **Runbook command for root e2e test needed correction to a TypeScript-capable execution path.**
