# Yurbrain Nhost storage hardening (production baseline)

This document defines the exact storage bucket rules required for Alpha safety, and how storage objects map to owner-scoped DB metadata.

## Scope and source of truth

- Bucket configuration (read/write/public behavior, MIME/size limits) is configured in the Nhost dashboard.
- Attachment ownership metadata is repository-managed in:
  - `packages/db/migrations/0012_nhost_storage_attachments.sql`
  - `nhost/metadata/databases/default/tables/public_attachments.yaml`
- Current codebase status: attachment/storage is still primarily a metadata + dashboard-hardening path in this repo snapshot.
  There is no confirmed end-to-end API/client upload/download/delete implementation wired into capture yet, so do not claim production-ready file handling until staged smoke evidence proves the real object flow.

## Required bucket rules (exact)

| Bucket | Purpose | Required object-key prefix | Public access | Read rule | Write/Delete rule | MIME allowlist | Max size |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `avatars` | user profile images | `user/{user_id}/avatar/` | **off by default** | authenticated owner via signed URL (or explicit documented exception) | owner only | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `capture_assets` | capture-linked assets | `user/{user_id}/captures/{item_id}/` | off | authenticated owner via signed URL | owner only | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`, `text/markdown`, `audio/mpeg`, `audio/mp4`, `audio/wav` | 25 MB |
| `imports` | temporary import files | `user/{user_id}/imports/{job_id}/` | off | authenticated owner via signed URL | owner only | `text/csv`, `application/json`, `text/plain`, `text/markdown`, `application/zip` | 100 MB |

### Notes for `avatars`

- Do not make the entire bucket public.
- If public avatar display is ever required, make it an explicit product decision and document the narrowed object exposure strategy.

## Attachment/file metadata isolation

`attachments` is user-isolated with two enforcement layers:

1. Hasura row permissions (`public_attachments.yaml`):
   - filter/check on `user_id = X-Hasura-User-Id`
   - insert preset `user_id <- X-Hasura-User-Id`
2. Database FK constraints (`0012_nhost_storage_attachments.sql`):
   - `attachments.user_id -> profiles.id`
   - `attachments(item_id, user_id) -> brain_items(id, user_id)`

This prevents cross-user attachment linkage and ensures metadata rows stay owner-bound.

## Dashboard-only configuration steps (manual)

If bucket controls are not encoded in repo metadata, apply these in Nhost dashboard:

1. Open **Storage → Buckets**.
2. Create/verify buckets: `avatars`, `capture_assets`, `imports`.
3. For each bucket, set:
   - public access: as specified in the table above
   - max file size
   - allowed MIME types
4. Configure object key conventions in upload implementation and operational runbooks:
   - enforce prefix `user/{user_id}/...`
5. Validate with two-user test:
   - user A uploads file and can read it
   - user B cannot list/read/delete user A file
6. Record dashboard settings in release evidence (screenshots or checklist tick-off).

## Ownership model

Ownership must be consistent across storage and DB:

1. Object path namespace: `user/{user_id}/...`
2. DB record owner: `attachments.user_id`
3. Linked item owner: `brain_items.user_id` (enforced by composite FK)

## Operational guardrails

1. Never expose `NHOST_ADMIN_SECRET` in web/mobile bundles.
2. Use signed URLs for private file reads.
3. Keep attachment metadata write in the same logical flow as upload completion.
4. Periodically clean orphaned/stale objects (`pending`, `failed`, `deleted` lifecycle rows).
5. Re-verify bucket rules on every production launch checklist run.
