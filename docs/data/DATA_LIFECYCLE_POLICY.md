# Data Lifecycle Policy

_Status: alpha baseline; privacy/legal review required before public launch._

## Current lifecycle truth

| Entity | Create | Update | Archive/delete | Production status |
| --- | --- | --- | --- | --- |
| BrainItem | Capture/API create | Title/content/status update | Archive via `status=archived`; hard delete pending | Supported with archive only |
| ItemArtifact | AI, relation, Explore services | Immutable in normal flow | Follows parent item; cascade decision pending | Supported, deletion policy pending |
| ItemThread / ThreadMessage | Comments and Ask Yurbrain | Messages immutable | Follows parent item; hard delete pending | Supported, deletion policy pending |
| FeedCard | Capture/feed/Explore generation | Dismiss/snooze/remind/refresh state | Soft state only | Supported |
| Task | Manual/AI conversion | Title/status/source update | Hard delete pending | Supported downstream |
| Session | Start/pause/finish | State transition | Hard delete pending | Supported downstream |
| Event | Server allowlisted append | Immutable | Raw read blocked; retention pending | Internal only |
| UserPreference | `/preferences/me` upsert | Upsert | Account lifecycle pending | Supported |
| Attachment metadata | DB schema/tests only | Metadata lifecycle not exposed by API | Object/metadata lifecycle deferred | Not in web-first launch scope |

## Retention posture

- Alpha launch retains user-owned continuity records until an explicit archive/delete/account lifecycle is implemented.
- Raw event reads are disabled; events remain internal observability/product-signal records.
- Attachment object bytes are not production-supported for web-first launch.
- Logs must avoid raw user content where possible and redact secrets/tokens.

## Access and deletion request workflow

Until product/API deletion flows exist:

1. Confirm requester identity through the configured auth/support channel.
2. Export or inspect only minimum required user-owned records.
3. Archive BrainItems where user-facing removal is requested and hard delete is not yet implemented.
4. Escalate hard-delete/account-deletion requests to engineering/privacy DRI.
5. Record limitations and user communication in the support ticket.

## Launch blockers

Production cannot claim full data deletion support until:

- hard-delete/cascade semantics are defined,
- backup retention implications are documented,
- item/artifact/thread/feed/task/session/event deletion behavior is tested,
- account deletion/deactivation workflow is approved,
- attachment object deletion is implemented if storage enters scope.
