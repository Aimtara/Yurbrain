# Yurbrain Hasura permissions (initial baseline)

This is the initial permission model for Nhost/Hasura.
It assumes authenticated app users with Hasura claims:

- `X-Hasura-User-Id`
- `X-Hasura-Role`

## Roles

- `user`: default end-user role for web/mobile.
- `service`: privileged server/API role for background and admin operations.
- `anonymous`: disabled for data tables (no direct table access).

## Ownership rule

For user-owned rows, ownership is:

- `user_id = X-Hasura-User-Id`

For profiles:

- `profiles.id = X-Hasura-User-Id`

## Per-table permissions (role: `user`)

### `profiles`

- select: `id = X-Hasura-User-Id`
- insert: preset `id = X-Hasura-User-Id`
- update: `id = X-Hasura-User-Id`
- delete: disabled (optional; generally avoid deleting profile rows from clients)

### `brain_items` (captures equivalent)

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### `tags`

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### `capture_tags`

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### `collections`

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### `collection_items`

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### `attachments`

- select/insert/update/delete: `user_id = X-Hasura-User-Id`
- insert preset: `user_id = X-Hasura-User-Id`

### Optional AI tables

- `embedding_jobs`, `capture_embeddings`, `resurfacing_events`, `ai_summaries`
  - select: `user_id = X-Hasura-User-Id`
  - insert/update/delete:
    - preferred: deny for `user` role, allow only `service`
    - if user writes are needed for MVP, enforce `user_id = X-Hasura-User-Id` with presets

## Role: `service`

`service` role is for trusted backend/API operations.
Recommended permissions:

- full CRUD on all Yurbrain tables
- ability to process queued jobs (`embedding_jobs`)
- ability to write AI/system-generated rows (`capture_embeddings`, `ai_summaries`, `resurfacing_events`)

Never expose `service` credentials to web/mobile clients.

## Insert presets summary

Set these columns automatically on user inserts:

- `profiles.id <- X-Hasura-User-Id`
- `*.user_id <- X-Hasura-User-Id` for all user-owned tables

This prevents spoofed ownership values from client mutations.

## Notes on legacy/current repo model

- Existing Yurbrain tables already use owner columns (`user_id`) in key places.
- These rules intentionally align with current owner-scoped direction and strict-auth migration docs.
