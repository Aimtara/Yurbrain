# Yurbrain Nhost Storage model (initial)

This defines initial Nhost storage buckets and access patterns.

## Buckets

### 1) `avatars`

Purpose:

- Profile pictures for `profiles.avatar_url`.

Typical object key:

- `user/{user_id}/avatar/{file_id}.{ext}`

Access pattern:

- read: public or signed-read (choose signed-read for stricter privacy)
- upload/update/delete: owner only (`X-Hasura-User-Id` must match key ownership)

Notes:

- keep files small and image-only where possible.
- enforce MIME allowlist (`image/jpeg`, `image/png`, `image/webp`).

---

### 2) `capture_assets`

Purpose:

- Files linked to captures (`attachments` table), including images, docs, audio, and imported snippets/assets.

Typical object key:

- `user/{user_id}/captures/{capture_id}/{file_id}-{sanitized_name}`

Access pattern:

- read: signed URL only (recommended)
- upload/delete: owner only
- list: owner only

Notes:

- this is the primary private bucket for second-brain data.
- keep ownership mirrored in `attachments.user_id`.

---

### 3) `imports`

Purpose:

- Temporary or source import blobs (CSV/markdown/zip/export files) used during ingestion.

Typical object key:

- `user/{user_id}/imports/{import_job_id}/{file_name}`

Access pattern:

- read: owner only (signed URL)
- upload/delete: owner only

Notes:

- apply lifecycle cleanup policy for stale import files.
- avoid serving directly to clients unless explicitly needed.

## Cross-bucket security guidance

1. Never store `service` secrets in object metadata.
2. Keep bucket/object ownership enforceable by `user_id` naming convention and row-level metadata in `attachments`.
3. Prefer signed URLs for user data downloads.
4. Restrict MIME/file-size per bucket.
5. Validate upload intent server-side for sensitive flows.
