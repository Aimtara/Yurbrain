# Yurbrain Nhost storage hardening (production baseline)

This document defines the production-safe Nhost storage model for Yurbrain and maps storage objects to database ownership.

## Buckets

### `avatars`

Purpose:

- Profile images linked from `profiles.avatar_url`.

Object key shape:

- `user/{user_id}/avatar/{file_id}.{ext}`

Allowed MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`

Max file size:

- 5 MB

Access model:

- upload/delete/list: owner only
- read:
  - default: signed URL only (private)
  - optional public mode: only if intentionally enabled for avatar UX

Public avatar policy:

- Do **not** make the entire bucket public by default.
- If public avatars are required, expose only intentionally selected avatar objects.
- Keep all non-avatar user files private.

### `capture_assets`

Purpose:

- Capture-related user files (images, docs, audio, pdf) linked to application rows.

Object key shape:

- `user/{user_id}/captures/{capture_id}/{file_id}-{sanitized_name}`

Allowed MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`
- `text/plain`
- `text/markdown`
- `audio/mpeg`
- `audio/mp4`
- `audio/wav`

Max file size:

- 25 MB

Access model:

- upload/delete/list/read: owner only
- downloads should use signed URLs from authenticated context

### `imports`

Purpose:

- Temporary import source files (csv/json/markdown/zip) used by ingestion workflows.

Object key shape:

- `user/{user_id}/imports/{import_job_id}/{file_name}`

Allowed MIME types:

- `text/csv`
- `application/json`
- `text/plain`
- `text/markdown`
- `application/zip`

Max file size:

- 100 MB

Access model:

- upload/delete/list/read: owner only
- no direct public access

Lifecycle:

- apply expiry/cleanup policy for stale import objects after processing.

## Ownership model

Ownership is enforced in two layers:

1. Storage path convention:
   - every object key is prefixed with `user/{user_id}/...`.
2. Database metadata:
   - `attachments.user_id` is owner-of-record for each stored object.
   - `attachments.bucket + attachments.object_key` is unique.

## File metadata linkage to database

Additive migration `packages/db/migrations/0012_nhost_storage_attachments.sql` creates `attachments`:

- `user_id` -> owning user
- `item_id` -> linked `brain_items.id`
- `bucket`, `object_key` -> exact storage location
- `kind`, `mime_type`, `size_bytes`, `sha256`, `storage_etag`
- `status` (`pending`, `uploaded`, `failed`, `deleted`)
- `metadata` JSONB for optional client/server metadata

Hasura metadata `nhost/metadata/databases/default/tables/public_attachments.yaml` enforces:

- user role can only read/write rows where `user_id = X-Hasura-User-Id`
- insert preset forces `user_id` from JWT claim
- no anonymous/public table access

## User-only access rules

- `capture_assets` and `imports` remain private in all environments.
- `avatars` remains private by default; public read is opt-in and narrowly scoped.
- Client apps only use anon/authenticated user credentials.
- Admin/service credentials remain server-only and are never shipped to web/mobile bundles.

## Upload / download / delete examples

Examples below use the client-side Nhost SDK with authenticated user sessions.

### Upload (private capture asset)

```ts
const uploadResult = await nhost.storage.upload({
  bucketId: "capture_assets",
  file,
  id: `user/${userId}/captures/${captureId}/${crypto.randomUUID()}-${file.name}`
});

if (uploadResult.error) throw uploadResult.error;

await nhost.graphql.request(
  `
  mutation LinkAttachment($object: attachments_insert_input!) {
    insert_attachments_one(object: $object) { id bucket object_key status }
  }
  `,
  {
    object: {
      item_id: captureId,
      bucket: "capture_assets",
      object_key: uploadResult.fileMetadata?.id,
      kind: "file",
      mime_type: file.type,
      size_bytes: file.size,
      status: "uploaded"
    }
  }
);
```

### Download (signed URL for private object)

```ts
const { data, error } = await nhost.storage.getPresignedUrl({
  bucketId: "capture_assets",
  fileId: objectKey
});
if (error) throw error;
const signedUrl = data?.presignedUrl;
```

### Delete (object + metadata row)

```ts
const { error: deleteErr } = await nhost.storage.delete({
  bucketId: "capture_assets",
  fileId: objectKey
});
if (deleteErr) throw deleteErr;

await nhost.graphql.request(
  `
  mutation MarkAttachmentDeleted($id: uuid!) {
    update_attachments_by_pk(pk_columns: { id: $id }, _set: { status: "deleted" }) {
      id
      status
    }
  }
  `,
  { id: attachmentId }
);
```

## Operational guardrails

1. Never expose `NHOST_ADMIN_SECRET` to client runtimes.
2. Enforce MIME + size checks in both bucket config and app/API validation paths.
3. Keep attachment metadata writes atomic with upload completion when possible.
4. Audit and clean stale `pending`/`failed`/orphaned files periodically.
5. Prefer signed URLs over public bucket/object permissions for user data.
