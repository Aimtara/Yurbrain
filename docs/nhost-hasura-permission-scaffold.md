# N5 Hasura Permission Scaffold (Owner-Scoped Baseline)

This document defines the N5 permission scaffolding required before GraphQL cutover.
It is a planning artifact for N5 and does not force runtime transport cutover.

## Goals

1. Owner-scoped access for main user tables.
2. Deterministic insert ownership from auth subject.
3. Stricter defaults for `item_artifacts` and `events`.

## Role assumptions

- Primary app role: `user`.
- JWT claim source:
  - `X-Hasura-User-Id`
  - `X-Hasura-Role`

## Baseline owner-scoped rules

For each table below, `user` role should only see rows where owner field equals `X-Hasura-User-Id`.

- `profiles`: `id = X-Hasura-User-Id`
- `brain_items`: `user_id = X-Hasura-User-Id`
- `feed_cards`: `user_id = X-Hasura-User-Id`
- `tasks`: `user_id = X-Hasura-User-Id`
- `sessions`: `user_id = X-Hasura-User-Id`
- `item_threads`: `user_id = X-Hasura-User-Id`
- `thread_messages`: `user_id = X-Hasura-User-Id`
- `item_artifacts`: `user_id = X-Hasura-User-Id` (read restricted, write blocked from client role)
- `events`: `user_id = X-Hasura-User-Id` (no direct client access in MVP path)
- `user_preferences`: `user_id = X-Hasura-User-Id`

## Insert preset plan

When client-side GraphQL writes are enabled for a table, set owner field from auth claim:

- `user_id` preset: `X-Hasura-User-Id`
- `id` preset for `profiles`: `X-Hasura-User-Id`

### N5 scope note

N5 only defines this plan. Actual Hasura metadata wiring is applied during N6/N7 cutover slices.

## Stricter safety treatment

### `item_artifacts`

- `user` role:
  - `select`: owner-scoped only.
  - `insert/update/delete`: denied by default.
- Server/function role (future):
  - writes allowed for trusted pipelines only.

### `events`

- `user` role:
  - no direct `select/insert/update/delete`.
- Aggregated/function outputs remain the allowed product surface.

## Backfill dependency for permission safety

Before enabling owner-scoped rules in production:

1. Backfill `sessions.user_id` from task ownership.
2. Backfill `item_threads.user_id` from target `brain_items.user_id`.
3. Backfill `thread_messages.user_id` from parent thread ownership.
4. Backfill `item_artifacts.user_id` from parent item ownership.
5. Verify no null owners remain in owner-scoped tables.

## Demo/founder user mapping strategy

- Keep seeded local UUID (`11111111-1111-1111-1111-111111111111`) as local/dev compatibility principal.
- In production, owner identity always derives from Nhost auth subject.
- Do not preserve runtime demo fallback on migrated strict-auth paths.
