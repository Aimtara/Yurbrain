# Yurbrain Hasura permissions (production-safe baseline)

This document reflects the implemented Hasura metadata in `nhost/metadata`.

## Role model

- `user`: authenticated end-user role for web/mobile.
- `service`: privileged server-side role used by trusted backend workloads.
- `anonymous`: no table permissions (no public data-table access).

## Claim assumptions

- `X-Hasura-User-Id`: UUID principal for the authenticated user.
- `X-Hasura-Role`: effective role (`user`, `service`, or `anonymous`).
- `X-Hasura-Allowed-Roles`: includes at least the role being used.

## Ownership predicates

- Standard owner tables: `user_id = X-Hasura-User-Id`
- Profile table: `id = X-Hasura-User-Id`

## Protected tables (current runtime schema)

The following tables are protected with owner-scoped `user` permissions:

- `profiles`
- `brain_items`
- `item_artifacts`
- `item_threads`
- `thread_messages`
- `feed_cards`
- `tasks`
- `sessions`
- `events`
- `user_preferences`

## User-role permissions

For `user`, permissions are constrained as follows:

- `select`: owner predicate only.
- `insert`: owner predicate only + owner column preset from `X-Hasura-User-Id`.
- `update`: owner predicate only.
- `delete`: owner predicate only.

### Column presets

- `profiles.id <- X-Hasura-User-Id`
- `*.user_id <- X-Hasura-User-Id` for owner-scoped tables with `user_id`

These presets prevent spoofing ownership via client-supplied ids.

## Service-role permissions

`service` has full table CRUD for operational workloads (admin APIs, background pipelines, backfills).

Security boundary:

- `service` credentials are server-only.
- Never expose `service` JWT/admin credentials to web/mobile bundles.

## Anonymous/public access

- No table permissions are granted to `anonymous`.
- No public table read/write access is configured.
- If a future public use-case is required, grant it explicitly and narrowly per table/column.

## Permission filter performance indexes

Permission predicates are backed by indexes to avoid full scans on owner filters.

Existing indexes cover most tables via `user_id` and common sort columns.
Additive migration `0011_nhost_permission_filter_indexes.sql` adds additional owner-path indexes:

- `item_threads(user_id, created_at)`
- `thread_messages(user_id, created_at)`
- `feed_cards(user_id, lens, dismissed)`
- `tasks(user_id, status, created_at)`

## Metadata location

Implemented metadata files:

- `nhost/metadata/version.yaml`
- `nhost/metadata/databases/databases.yaml`
- `nhost/metadata/databases/default/tables/tables.yaml`
- `nhost/metadata/databases/default/tables/public_*.yaml` (table-level permission specs)

## Remaining security assumptions

- JWT issuance/verification is correctly configured by Nhost Auth.
- Role claims are trusted only from signed JWTs.
- Admin secret and server role credentials remain server-only.
- API routes that bypass Hasura still enforce ownership checks server-side.
