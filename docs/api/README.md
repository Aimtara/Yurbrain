# API Notes (Sprint 5)

## Threads

- `POST /threads` creates an item-comment or item-chat thread.
- `GET /threads/:id` fetches a thread by id.
- `GET /threads/by-target?targetItemId=<uuid>` lists threads, optionally filtered by target item.

## Messages

- `POST /messages` appends a thread message.
- `GET /threads/:id/messages` lists all messages for a thread.

## Feed

- `GET /feed?userId=<uuid>` returns deterministic, non-dismissed stored feed cards ranked by feed logic (not a simple reverse-created listing).
- `POST /functions/feed/generate-card` stores a placeholder/generated feed card for deterministic retrieval.
- `POST /feed/:id/dismiss` marks a feed card as dismissed.
- `POST /feed/:id/snooze` snoozes a feed card until a future timestamp.
- `POST /feed/:id/refresh` increments refresh metadata and returns the new count.

## Task conversion and task loop

- `POST /tasks/manual-convert` creates a deterministic `todo` task from item/comment content.
- `POST /functions/convert` returns one of: `task_created`, `plan_suggested`, `not_recommended`.
- `POST /tasks` creates a task.
- `GET /tasks/:id` fetches a task.
- `PATCH /tasks/:id` updates title/status.
- `GET /tasks?userId=<uuid>&status=<todo|in_progress|done>` lists tasks with optional filters.

## Session lifecycle

- `POST /tasks/:id/start` starts a session for a task and moves task status to `in_progress`.
- `POST /sessions/:id/pause` pauses a running/paused session.
- `POST /sessions/:id/finish` finishes the session and marks the task as `done`.

## AI endpoints (validation + fallback)

- `POST /functions/summarize` validates model envelope, persists a `summary` artifact, and falls back deterministically on timeout/invalid output.
- `POST /functions/classify` validates model envelope, persists a `classification` artifact, and falls back deterministically on timeout/invalid output.
- `POST /functions/query` validates model envelope, appends both the user question and assistant reply to a thread, and falls back deterministically on timeout/invalid output.
- AI responses include `fallbackUsed` and optional `fallbackReason` (`timeout` or `invalid_or_runner_error`).

## LLM provider foundation (L1, non-user-facing)

- Provider foundation lives at `apps/api/src/services/ai/provider/`.
- It adds one normalized invocation path (`invokeLlm`) that future thin-slice features can call.
- Current routes do not yet use this provider path; summarize/classify/query and synthesis remain deterministic/fallback as before.
- Config is env-driven:
  - `YURBRAIN_LLM_ENABLED` (`true`/`false`, default `true`)
  - `YURBRAIN_LLM_PROVIDER` (`openai`)
  - `YURBRAIN_LLM_API_KEY`
  - `YURBRAIN_LLM_BASE_URL` (optional, default `https://api.openai.com/v1`)
  - `YURBRAIN_LLM_MODEL` (optional, default `gpt-4o-mini`)
  - `YURBRAIN_LLM_TIMEOUT_MS` (optional, default `1800`)
  - `YURBRAIN_LLM_MAX_OUTPUT_TOKENS` (optional, default `220`)
  - `YURBRAIN_LLM_TEMPERATURE` (optional, default `0.2`)

## Validation and error mapping

- Request payloads are validated with Zod.
- Validation failures return `400` with `{ message, issues[] }`.
- Non-validation server failures return `500` with a generic message.
