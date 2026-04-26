# Yurbrain Storage Lifecycle

_Status: production-deferred until executable upload/read/list/delete proof exists._

## Current implementation truth

- The database has attachment metadata (`attachments`) with `userId`, `itemId`, `bucket`, `objectKey`, lifecycle `status`, and storage metadata fields.
- Nhost metadata contains `public_attachments` permission scaffolding.
- Nhost bucket hardening requirements are documented in `docs/nhost/storage.md`.
- No production-ready API/client upload, read/download, list, or delete lifecycle route is currently proven in this repository.
- Web and mobile capture UI copy already labels native file upload and voice capture as post-alpha; production launch must keep those affordances placeholder/deferred or hide them.

Therefore, attachments are **not in web-first production launch scope** unless a later change implements and tests the full lifecycle below.

## Core data lifecycle status

| Entity | Create | Update | Archive/delete | Current production status |
| --- | --- | --- | --- | --- |
| BrainItem | `POST /brain-items` / `POST /capture/intake` | `PATCH /brain-items/:id` | Archive via `PATCH status=archived`; hard delete not implemented | Archive-supported; hard delete policy pending |
| ItemArtifact | Created by AI/relation/Explore services | Not generally mutable | Follows parent item policy; no standalone delete | Needs deletion cascade decision before production deletion claims |
| Thread/message | `POST /threads`, `POST /messages`, AI query flow | Messages immutable | Follows parent item policy; no standalone delete | Continuation supported; deletion policy pending |
| FeedCard | Generated from capture/feed/Explore | Dismiss/snooze/remind/refresh state | Soft state only | Supported for Focus; retention policy pending |
| Task/session | Manual/AI convert, start/pause/finish | Task status/title, session state | No hard delete | Supported downstream conversion; deletion policy pending |
| Event | Server append-only allowlisted events | Immutable | Raw read blocked; retention pending | Internal only |
| UserPreference | `GET/PUT /preferences/me` and legacy scoped path | Upsert | Account lifecycle pending | Supported |
| Attachment | Metadata table only | Metadata lifecycle not exposed by API | Object/metadata delete not exposed | Production-deferred |

## Required lifecycle before production support

| Flow | Requirement | Evidence required |
| --- | --- | --- |
| Request upload | Authenticated user requests an upload for an owned BrainItem | API test and client smoke |
| Upload object | Object key must be `user/{user_id}/captures/{item_id}/...` | Storage provider smoke |
| Create metadata | Metadata row owner must equal `currentUser.id` and item owner | DB/API test |
| List | User lists only attachments for owned item | Two-user denial test |
| Read/download | Private object read through signed/authorized URL | Two-user denial test |
| Delete | Delete or mark `deleted`; object and metadata remain consistent | Lifecycle smoke |
| Deleted read | Deleted attachment cannot be read | API/storage test |
| Validation | MIME and size allowlists enforced | Negative tests |
| Provider failure | Safe error body, no secret/object leakage | Negative tests |

## Production-deferred behavior

Until lifecycle proof exists:

- Do not claim production attachment support.
- Do not include attachment upload/read/delete in launch promises.
- Keep any capture attachment UI affordance clearly placeholder/deferred or hide it for production launch.
- Keep storage gate red or marked explicitly deferred in release criteria.

## Owner model

- API identity: `currentUser.id` from verified bearer in strict/staging/production.
- Metadata owner: `attachments.user_id`.
- Parent owner: `brain_items.user_id`.
- Object namespace: `user/{user_id}/...`.

All four must agree before any object read/write/delete is allowed.

