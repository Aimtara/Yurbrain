# Storage launch scope

Last updated: 2026-04-30

## Decision

Storage and native attachments are **deferred for production launch**.

Yurbrain may capture text, links, and image/file references as plain metadata. It must not claim production support for binary upload, read/download, list, delete, retention, object restore, or provider error handling until those flows are proven end-to-end.

## Current supported scope

- Text capture.
- Link capture.
- Image URL or file-reference text capture.
- Attachment metadata scaffolding and local database tests.
- Documentation for storage lifecycle and launch decision.

## Out of production scope

- Native browser file picker upload.
- Mobile camera roll upload.
- Binary object download/read proof.
- Object deletion and deleted-read denial proof.
- MIME/size validation against a real provider.
- Two-user object isolation against managed storage.
- Storage provider outage/retry behavior.

## UI requirement

Production UI copy must not say “upload attachment” or imply native uploads are supported. Current capture copy says image/file URL references are allowed and native uploads are outside production scope.

## Evidence required to promote storage into scope

1. Staging User A uploads a supported file.
2. User A can list/read/download it.
3. User B cannot list/read/download it.
4. Unsupported MIME/oversize file is rejected safely.
5. User A deletes the object.
6. Deleted object cannot be read.
7. Metadata and object state remain consistent.
8. Backup/restore drill covers attachment metadata and object lifecycle expectations.
9. Operator signs off storage support and limits.

Until this evidence exists, storage remains deferred and production may launch only if humans explicitly accept that deferral.
