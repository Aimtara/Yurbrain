# Data Inventory

Status: alpha governance baseline, not a compliance certification.

| Data class | Examples | Storage | Owner/scope | Sensitivity | Retention/deletion status |
| --- | --- | --- | --- | --- | --- |
| Profile | id, email, display name, avatar URL | `profiles`, Nhost auth | user | PII | Access/deletion workflow pending |
| BrainItem | title, raw content, source, note, topic guess | `brain_items` | `user_id` | potentially sensitive user memory | archive exists; hard-delete policy pending |
| Artifact | summaries, classifications, relation/connection payloads | `item_artifacts` | parent item/user | derived sensitive content | follows item lifecycle; deletion policy pending |
| Thread/message | comments, user questions, AI replies | `item_threads`, `thread_messages` | parent item/user | sensitive continuation data | follows item lifecycle; deletion policy pending |
| FeedCard | resurfacing cards, dismiss/snooze metadata | `feed_cards` | `user_id` | behavioral metadata | soft state; retention pending |
| Task/session | converted actions and work sessions | `tasks`, `sessions` | `user_id` | behavioral/action data | deletion/export policy pending |
| Event | allowlisted product events | `events` | `user_id` | behavioral telemetry | raw public reads blocked; retention pending |
| Preference | focus mode, density, AI mode | `user_preferences` | `user_id` | low/medium | account lifecycle pending |
| Attachment metadata | bucket, object key, MIME, size, status | `attachments` | `user_id`, parent item | file metadata | production lifecycle deferred |
| Storage object | capture assets/imports/avatars | Nhost storage | object prefix + metadata | potentially sensitive | production lifecycle deferred |

## Data minimization rules

- Prefer derived summaries over raw event exposure.
- Do not expose admin/support diagnostics until a safe scoped model exists.
- Do not log raw tokens, secrets, or unnecessary user content.
- Do not claim GDPR/HIPAA/SOC 2 compliance without formal review/certification.
