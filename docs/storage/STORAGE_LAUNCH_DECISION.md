# Storage Launch Decision

_Decision date: 2026-04-26._

## Decision

Storage and native attachments are **deferred from the first web production launch**.

Yurbrain will launch web-first with text/link capture, BrainItem continuity,
comments, optional bounded AI, downstream task/session conversion, and
source-linked Explore connections. Attachment object upload/read/list/delete is
not production-supported until the full lifecycle is implemented and evidenced.

## Current implementation truth

- The database includes attachment metadata (`attachments`) with owner, parent
  item, bucket, object key, MIME, size, hash, status, and timestamps.
- Nhost metadata and docs include permission/bucket scaffolding.
- Local storage smoke verifies metadata and backup/restore behavior only.
- No production API route currently proves object upload, authorized read,
  list, delete, deleted-read denial, MIME/size validation, or provider failure
  handling.
- Web and mobile capture affordances are designed to keep native upload out of
  production scope by default.

## Reason

Attachment storage has a higher blast radius than text capture because object
permissions, metadata ownership, lifecycle deletion, backups, and restore all
need to be correct together. Deferring storage preserves the core continuity
loop while avoiding unsupported production claims.

## Production behavior

- Do not advertise attachment upload/read/delete in production release notes.
- Keep storage flags false/unset unless a later signed launch decision reverses
  this decision.
- Keep mobile image/file capture disabled unless
  `EXPO_PUBLIC_YURBRAIN_STORAGE_ENABLED=true` is intentionally set for a
  non-production preview.
- Treat any visible native upload affordance in web-first production as a launch
  blocker unless it is clearly disabled/deferred.
- Staging signoff should mark storage as deferred, not passed.

## Reversal criteria

Storage may enter production scope only after all of the following are true:

1. Authenticated upload request for an owned BrainItem.
2. Private object upload under `user/{user_id}/captures/{item_id}/...`.
3. Metadata creation with `attachments.user_id = currentUser.id`.
4. Owner-only list.
5. Owner-only authorized read/download.
6. Delete/soft-delete lifecycle.
7. Deleted-read denial.
8. MIME and size validation.
9. Provider error handling with safe error responses.
10. Two-user storage isolation smoke in staging.
11. Backup/restore drill includes object bytes and metadata.
12. Product/support/compliance docs updated.

## Evidence status

| Evidence | Status |
| --- | --- |
| Metadata schema | Present |
| Metadata smoke | Local only |
| Object upload/read/list/delete | Missing |
| Two-user object isolation | Missing |
| Staging storage proof | Missing |
| Production launch scope | Deferred |

