# Yurbrain Authorization Sweep

_Last updated: April 26, 2026._

## Policy

Production routes must resolve identity from a verified bearer token and must scope every user-owned resource to `currentUser.id`. Caller-supplied `userId` values in headers, query strings, params, or bodies are not authoritative in strict/staging/production mode.

Legend:

- **Covered**: automated denial or scoping test exists.
- **Partial**: route has owner checks, but route-specific negative test coverage is incomplete.
- **Blocked/deferred**: not production-enabled.

## Route matrix

| Route | Resource | Owner field | Auth required | Cross-user test | Legacy userId accepted? | Production allowed? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /brain-items` | BrainItem | `userId = currentUser.id` | Yes | Covered by JWT/high-value flow | No in strict | Yes | Covered |
| `GET /brain-items` | BrainItem list/search | `brain_items.userId` | Yes | Covered by search isolation | No | Yes | Covered |
| `GET /brain-items/:id` | BrainItem | `brain_items.userId` | Yes | Covered | No | Yes | Covered |
| `PATCH /brain-items/:id` | BrainItem | `brain_items.userId` | Yes | Covered | No | Yes | Covered |
| `GET /brain-items/:id/artifacts` | ItemArtifact via item | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /brain-items/:id/related` | Related items | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /capture/intake` | BrainItem + feed card + event | `userId = currentUser.id` | Yes | Covered by capture isolation | No | Yes | Covered |
| `GET /feed` | FeedCard list | `feed_cards.userId` | Yes | Covered | No | Yes | Covered |
| `POST /feed/:id/dismiss` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /feed/:id/snooze` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /feed/:id/remind-later` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /feed/:id/refresh` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /functions/feed/generate-card` | FeedCard | `userId = currentUser.id` | Yes | Partial | No | Yes | Needs generated-card scope test |
| `GET /functions/feed` | FeedCard list | `feed_cards.userId` | Yes | Covered | No | Yes | Covered |
| `POST /functions/feed/:id/dismiss` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /functions/feed/:id/snooze` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /functions/feed/:id/refresh` | FeedCard | `feed_cards.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /threads` | ItemThread | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /threads/:id` | ItemThread | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /threads/by-target` | ItemThread list | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /messages` | ThreadMessage | parent item owner | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /threads/:id/messages` | ThreadMessage list | parent item owner | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /ai/brain-items/:id/summarize` | ItemArtifact | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /ai/brain-items/:id/classify` | ItemArtifact | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /ai/brain-items/:id/query` | ItemThread/Message | parent `brain_items.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /ai/convert` | Task decision | source item owner when provided | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /functions/summarize` | ItemArtifact | parent `brain_items.userId` | Yes | Covered | No | Yes | Covered |
| `POST /functions/classify` | ItemArtifact | parent `brain_items.userId` | Yes | Covered | No | Yes | Covered |
| `POST /functions/query` | ThreadMessage | parent item owner | Yes | Covered | No | Yes | Covered |
| `POST /functions/convert` | Task | source item owner when provided | Yes | Covered | No | Yes | Covered |
| `POST /functions/summarize-progress` | Derived AI summary | all source item owners | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /functions/what-should-i-do-next` | Derived AI next step | all source item owners | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /functions/founder-review` | Derived diagnostics | `currentUser.id` filters | Yes | Covered for spoofing | No | Yes | Covered |
| `GET /functions/founder-review/diagnostics` | Derived diagnostics | `currentUser.id` filters | Yes | Covered for spoofing | No | Yes | Covered |
| `POST /functions/session-helper` | Task/Session | task owner | Yes | Partial | No | Yes | Needs route-specific denial test |
| `POST /tasks/manual-convert` | Task | source item owner + `currentUser.id` | Yes | Partial | No | Yes | Needs route-specific denial test |
| `POST /tasks` | Task | `userId = currentUser.id`; source item checked | Yes | Covered | No | Yes | Covered |
| `GET /tasks` | Task list | `tasks.userId` | Yes | Partial | Query userId ignored | Yes | Needs spoof query assertion |
| `GET /tasks/:id` | Task | `tasks.userId` | Yes | Covered | No | Yes | Covered |
| `PATCH /tasks/:id` | Task | `tasks.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /tasks/:id/start` | Session via Task | `tasks.userId` | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /sessions` | Session list | `sessions.userId` | Yes | Partial | Query userId ignored | Yes | Needs spoof query assertion |
| `POST /sessions/:id/pause` | Session | parent task owner | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /sessions/:id/finish` | Session | parent task owner | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /explore/connections/preview` | Explore source items | all source item owners | Yes | Covered by `sprint16/explore-connections.test.ts` and `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `POST /explore/connections/save` | Connection artifact/feed card | all source item owners | Yes | Covered by `sprint17/authz-route-denials.test.ts` | No | Yes | Covered |
| `GET /preferences/me` | UserPreference | `currentUser.id` | Yes | Partial | No | Yes | Needs route-specific test |
| `PUT /preferences/me` | UserPreference | `currentUser.id` | Yes | Partial | No | Yes | Needs route-specific test |
| `GET /preferences/:userId` | UserPreference | path ignored; `currentUser.id` | Yes | Covered | Path accepted but not authoritative | Yes | Covered legacy shape |
| `PUT /preferences/:userId` | UserPreference | path ignored; `currentUser.id` | Yes | Covered | Path accepted but not authoritative | Yes | Covered legacy shape |
| `GET /events` | Raw Event | n/a | n/a | Covered as blocked | n/a | No | Blocked with 403 |
| Attachment upload/read/list/delete | Attachment/storage object | `attachments.userId`, object prefix | Required | Not covered | No | No | Deferred; no production API lifecycle route exists |

## Immediate authz test backlog

1. Add remaining route-specific denial tests for item artifacts/related-item reads.
2. Add alias denial tests for `/ai/brain-items/:id/classify` and `/ai/brain-items/:id/query`.
3. Add multi-item denial tests for summarize-progress and what-should-i-do-next.
4. Add explicit preference `/me` tests and task/session list spoof query assertions.
5. Keep `/events` blocked until a scoped derived event API is designed.
6. Mark attachments production-deferred or implement full lifecycle tests before launch.
