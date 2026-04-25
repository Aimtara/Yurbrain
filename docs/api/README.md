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
- `POST /feed/:id/remind-later` is an alias for snooze with a default gentle delay.
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

Prompt-aligned compatibility aliases are also available:

- `POST /ai/brain-items/:id/summarize`
- `POST /ai/brain-items/:id/classify`
- `POST /ai/brain-items/:id/query`
- `POST /ai/convert`

These aliases preserve the same validation, ownership, persistence, and fallback behavior as the existing `/functions/*` routes.

## Explore prototype

- `POST /explore/connections/preview` returns deterministic, source-grounded connection candidates for 2–5 BrainItems. Preview does not persist.
- `POST /explore/connections/save` persists the chosen connection as an `ItemArtifact(type="connection")` and returns a `FeedCard(cardType="connection")` so the saved connection can return to Focus.

## Summarize Progress (L2 real-provider thin slice)

- `POST /functions/summarize-progress` now attempts one provider-backed call when LLM provider config is available.
- Prompt + grounding are isolated in:
  - `apps/api/src/services/functions/summarize-progress-prompt.ts`
  - `apps/api/src/services/functions/summarize-progress-llm.ts`
- Grounding includes item content, recent continuation messages, latest summary artifacts, linked task/session state, and blocker/source signals.
- The response remains contract-compatible (`summary`, `repeatedIdeas`, `suggestedNextAction`, `reason`) with optional extras:
  - `blockers`
  - `sourceSignals`
  - `usedFallback`
  - `fallbackReason`
- Deterministic fallback remains first-class and is used when provider is not configured, times out, errors, when grounding assembly fails, or when provider output is invalid/parse-failed.
- Successful provider output must include at least one grounded `sourceSignals` entry; otherwise the route treats the response as parse-failed and returns deterministic fallback.

## What Should I Do Next? (L3 real-provider thin slice)

- `POST /functions/what-should-i-do-next` now attempts one provider-backed call when LLM provider config is available.
- Prompt + grounding are isolated in:
  - `apps/api/src/services/functions/what-should-i-do-next-prompt.ts`
  - `apps/api/src/services/functions/what-should-i-do-next-llm.ts`
- Grounding includes item content, recent continuation messages, latest summary artifacts, linked task/session state, and the deterministic reason/repeated-idea signals.
- The response remains contract-compatible (`summary`, `repeatedIdeas`, `suggestedNextAction`, `reason`) with optional extras:
  - `sourceSignals`
  - `confidence`
  - `usedFallback`
  - `fallbackReason`
- Deterministic fallback remains first-class and is used when provider is not configured, times out, errors, when grounding assembly fails, or when provider output is invalid/parse-failed.
- Successful provider output must include at least one grounded `sourceSignals` entry and bounded `confidence` (`0..1`); otherwise the route treats the response as parse-failed and returns deterministic fallback.
- Output quality guardrails are enforced before accepting provider output:
  - summary and suggested next step must reference grounded item/task/session language from context
  - suggested next step must stay single-action oriented (rejects multi-step sequencing language)
  - provider responses that fail groundedness/one-action checks are classified as parse-failed and fallback deterministically

## L4 safety/logging hardening

- Both real-provider synthesis slices now use shared fallback classification utilities in:
  - `apps/api/src/services/functions/llm-fallback.ts`
- Unknown provider/parse/grounding failures are normalized to deterministic fallback with explicit reason mapping.
- Structured fallback logs now include:
  - `fallbackReason`
  - `fallbackStage` (`grounding` | `invoke` | `parse`)
  - `fallbackOrder`
  - `errorCode` (when provider error class is available)
  - `errorName`
  - `durationMs`
- Fallback logs intentionally avoid raw prompt/context dumps and secret-bearing request metadata.

## LLM provider foundation (L1)

- Provider foundation lives at `apps/api/src/services/ai/provider/`.
- It adds one normalized invocation path (`invokeLlm`) that future thin-slice features can call.
- Current item-level AI routes (`/functions/summarize`, `/functions/classify`, `/functions/query`) remain deterministic/fallback as before.
- Current real-provider routes:
  - `POST /functions/summarize-progress`
  - `POST /functions/what-should-i-do-next`
- Deterministic-first routes (no live provider path):
  - `POST /functions/summarize`
  - `POST /functions/classify`
  - `POST /functions/query`
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
