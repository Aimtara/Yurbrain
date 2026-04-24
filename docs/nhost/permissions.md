# Yurbrain Hasura permissions (production-safe baseline)

This document is an audit of the repository-managed Hasura metadata in `nhost/metadata`.

## Claims and identity source

All owner-scoped rules are based on verified JWT claims interpreted by Hasura:

- `X-Hasura-User-Id` (owner UUID)
- `X-Hasura-Role` (effective role)
- `X-Hasura-Allowed-Roles` (must include effective role)

Owner predicates used in metadata:

- profile table: `id = X-Hasura-User-Id`
- all other user-owned tables: `user_id = X-Hasura-User-Id`

## Roles currently configured in metadata

Current table metadata files define permissions for the `user` role only.

- `user`: owner-scoped table access.
- `anonymous`: no table permissions are defined.
- `service`: no table permissions are defined in Hasura metadata (server-side privileged flows use trusted API/admin paths rather than browser/mobile Hasura table roles).

## Protected tables and ownership rules

Protected by owner predicates in `nhost/metadata/databases/default/tables/public_*.yaml`:

- `profiles` (`id = X-Hasura-User-Id`)
- `brain_items` (`user_id = X-Hasura-User-Id`)
- `attachments` (`user_id = X-Hasura-User-Id`)
- `item_artifacts` (`user_id = X-Hasura-User-Id`)
- `item_threads` (`user_id = X-Hasura-User-Id`)
- `thread_messages` (`user_id = X-Hasura-User-Id`)
- `feed_cards` (`user_id = X-Hasura-User-Id`)
- `tasks` (`user_id = X-Hasura-User-Id`)
- `sessions` (`user_id = X-Hasura-User-Id`)
- `events` (`user_id = X-Hasura-User-Id`)
- `user_preferences` (`user_id = X-Hasura-User-Id`)

## Permission shape by table

General `user` pattern:

- `select`: owner-filtered.
- `insert`: owner-filtered check plus ownership preset from claim.
- `update`: owner-filtered (where supported).
- `delete`: owner-filtered (where supported).

Intentional exception:

- `events`: `select` only for `user`; no `insert`, `update`, or `delete` permissions.

## Ownership presets that prevent spoofing

- `profiles.id <- X-Hasura-User-Id`
- `*.user_id <- X-Hasura-User-Id` on owner-scoped tables

This prevents a client from writing another user's ownership id via mutation payloads.

## Anonymous/public access stance

- No `anonymous` table permissions are present in metadata.
- No public read/write table permissions are configured.
- Any future public table access must be explicitly documented and added with narrow column/filter scope.

## Attachment metadata isolation

`attachments` protection is layered:

1. Hasura owner filter (`user_id = X-Hasura-User-Id`) in `public_attachments.yaml`.
2. Database FK coupling in migration `0012_nhost_storage_attachments.sql`:
   - `attachments.user_id -> profiles.id`
   - composite FK `attachments(item_id, user_id) -> brain_items(id, user_id)`

This enforces that attachment rows remain bound to the same owner as the linked brain item.

## Index support for permission filters

Owner-filter paths are backed by additive indexes from:

- `packages/db/migrations/0011_nhost_permission_filter_indexes.sql`

Including:

- `item_threads(user_id, created_at)`
- `thread_messages(user_id, created_at)`
- `item_artifacts(user_id, type, created_at)`
- `sessions(user_id, started_at)`

## Operational/manual steps

Repository is source-of-truth for table permissions. Operationally:

1. Apply database migrations.
2. Apply Hasura metadata from `nhost/metadata`.
3. In Nhost dashboard, verify no ad-hoc permission drift was introduced.

If a dashboard hotfix is applied during incident response, mirror it back into repository metadata immediately.

## Security assumptions

- JWT verification is correctly configured in Nhost Auth/Hasura.
- JWT claims are trusted only from signed tokens.
- Admin credentials remain server-only.
- API routes that bypass Hasura table access still enforce owner checks server-side.
