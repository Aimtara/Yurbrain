# Data Inventory

Status: alpha governance baseline, not a compliance certification.

| Data class | Examples | Storage | Owner/scope | Sensitivity | Retention/deletion status |
| --- | --- | --- | --- | --- | --- |
| Profile | id, email, display name, avatar URL | `profiles`, Nhost auth | user | PII | Access/deletion workflow pending |
| BrainItem | title, raw content, source, note, topic guess | `brain_items` | `user_id` | potentially sensitive user memory | archive supported via `status=archived`; hard-delete policy pending |
| Artifact | summaries, classifications, relation/connection payloads | `item_artifacts` | parent item/user | derived sensitive content | retained with parent item today; hard-delete policy pending |
| Thread/message | comments, user questions, AI replies | `item_threads`, `thread_messages` | parent item/user | sensitive continuation data | retained with parent item today; hard-delete policy pending |
| FeedCard | resurfacing cards, dismiss/snooze metadata | `feed_cards` | `user_id` | behavioral metadata | dismiss/snooze soft state exists; retention pending |
| Task/session | converted actions and work sessions | `tasks`, `sessions` | `user_id` | behavioral/action data | task done/session finished lifecycle exists; deletion/export policy pending |
| Event | allowlisted product events | `events` | `user_id` | behavioral telemetry | raw public reads blocked; retention pending |
| Preference | focus mode, density, AI mode | `user_preferences` | `user_id` | low/medium | account lifecycle pending |
| Attachment metadata | bucket, object key, MIME, size, status | `attachments` | `user_id`, parent item | file metadata | production lifecycle deferred |
| Storage object | capture assets/imports/avatars | Nhost storage | object prefix + metadata | potentially sensitive | production lifecycle deferred |

## Data minimization rules

- Prefer derived summaries over raw event exposure.
- Do not expose admin/support diagnostics until a safe scoped model exists.
- Do not log raw tokens, secrets, or unnecessary user content.
- Do not claim GDPR/HIPAA/SOC 2 compliance without formal review/certification.

## Lifecycle decision log

| Decision | Current state | Production implication |
| --- | --- | --- |
| BrainItem archive | `PATCH /brain-items/:id` supports `status=archived` and owner checks. | Archive can be documented as the current reversible removal path. |
| BrainItem hard delete | No API/client hard-delete flow. | Do not promise hard deletion until policy, cascade, and restore implications are implemented. |
| Attachments | Metadata schema exists; object lifecycle is deferred. | Do not launch production file handling without implementation and two-user storage smoke. |
| Raw events | Writes exist; `GET /events` is blocked. | Prefer derived summaries until scoped event read model exists. |
