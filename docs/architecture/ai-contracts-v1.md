# AI Contracts v1

## Product guardrails

AI is optional intelligence layered on top of the continuity loop. It must not
block capture, feed loading, item detail rendering, comments, or manual task
creation.

AI outputs are persisted only as:

- `ItemArtifact` records (summary, classification, relation/connection, task conversion)
- `ThreadMessage` records (user query + assistant reply)

AI must never silently mutate `BrainItem.rawContent`, force task conversion, or
invent unsupported context. Every generated recommendation must remain concise,
source-grounded, confidence-calibrated, and dismissible.

## Envelope (required)

All AI-backed routes use a strict envelope before persistence:

- `content: string` (required, non-empty)
- `confidence: number` in `[0, 1]`
- `metadata: Record<string, unknown>` (optional, defaults to `{}`)

If the model output fails envelope validation or exceeds timeout budget, the API returns a deterministic fallback envelope and marks `fallbackUsed: true` plus `fallbackReason` (`timeout` or `invalid_or_runner_error`).

## Sprint 3 routes

- `POST /functions/summarize` → persists a `summary` artifact.
- `POST /functions/classify` → persists a `classification` artifact.
- `POST /functions/query` → appends both user question and assistant reply into an existing thread.

Compatibility aliases planned for the product route surface:

- `POST /ai/brain-items/:id/summarize`
- `POST /ai/brain-items/:id/classify`
- `POST /ai/brain-items/:id/query`
- `POST /ai/convert`

## Fallback policy

- **Summarize:** deterministic preview from source content.
- **Classify:** deterministic heuristic (`question` when `?` present, otherwise `note`).
- **Query:** deterministic acknowledgement echoing the user question.

## Safety guardrails

- All AI responses are validated before persistence.
- Timeout budget defaults to `800ms` and is overridable per request (`timeoutMs`).
- Failed AI calls never block user flow; fallback response is persisted/sent instead.

## ConnectionContract (Explore prototype target)

Explore connection previews use the same AI rules as the rest of Yurbrain, but
preview generation does not persist by default.

Input:

- `sourceItemIds`: 2–5 source BrainItems owned by the current user
- `mode`: `pattern | idea | plan | question`
- grounded source snippets from item title/content/topic and optional artifacts/comments

Output:

- `candidates[]`
  - `title`
  - `summary`
  - `whyTheseConnect[]`
  - `suggestedNextActions[]`
  - `confidence`

Rules:

- Each candidate must reference details from source cards/items.
- Results are framed as possible connections, not facts.
- Preview responses are not persisted until the user chooses Save Connection.
- Save persists an `ItemArtifact(type="connection")` plus a `FeedCard(type="connection")`.
- Deterministic fallback must be available when no model key exists.

## Provider integration foundation (L1)

The API now includes an isolated provider/config foundation under:

- `apps/api/src/services/ai/provider/config.ts`
- `apps/api/src/services/ai/provider/client.ts`
- `apps/api/src/services/ai/provider/index.ts`

This layer is intentionally thin and does not change user-facing AI behavior yet.

### Provider config (env-driven)

- `YURBRAIN_LLM_ENABLED` (`true` by default; set `false` to disable provider path)
- `YURBRAIN_LLM_PROVIDER` (`openai`)
- `YURBRAIN_LLM_API_KEY` (required when enabled)
- `YURBRAIN_LLM_BASE_URL` (optional; defaults to `https://api.openai.com/v1`)
- `YURBRAIN_LLM_MODEL` (optional; defaults to `gpt-4o-mini`)
- `YURBRAIN_LLM_TIMEOUT_MS` (optional; default `1800`)
- `YURBRAIN_LLM_MAX_OUTPUT_TOKENS` (optional; default `220`)
- `YURBRAIN_LLM_TEMPERATURE` (optional; default `0.2`)

### Normalized invocation path

Future feature slices should call one API:

- `invokeLlm({ instruction, context, timeoutMs?, temperature?, maxOutputTokens? })`

and handle typed provider errors:

- `not_configured`
- `timeout`
- `provider_error`
- `invalid_response`

Current deterministic runner + fallback flows remain canonical until feature-level integrations land.

## Summarize-progress real-provider slice (L2)

`POST /functions/summarize-progress` now uses a thin provider-backed path when provider config is available.

- Grounding source:
  - selected item ids (`itemIds`)
  - item title/content/topic and recency
  - latest summary artifacts
  - latest continuation/comment messages
  - linked task and session state signals
- Prompt location:
  - `apps/api/src/services/functions/summarize-progress-prompt.ts`
- Orchestration location:
  - `apps/api/src/services/functions/summarize-progress-llm.ts`

### Fallback policy (L2 summarize-progress only)

The route falls back to existing deterministic synthesis if provider path is unavailable or unsafe:

- provider not configured (`not_configured`)
- timeout (`timeout`)
- provider error (`provider_error`)
- response parse failure (`parse_failed`)
- prompt-grounding assembly failure before provider invocation (`provider_error`)

Additional groundedness guardrail:

- successful provider responses must include at least one `sourceSignals` entry; otherwise the response is treated as parse failure and deterministic fallback is returned (`parse_failed`).
- provider responses are quality-screened before acceptance:
  - summary must overlap grounded item/task/session signal vocabulary
  - suggested action must be concise and avoid multi-step orchestration language
  - low-signal or generic-looking responses are treated as parse failure and deterministic fallback is returned (`parse_failed`).

Returned shape remains backward-compatible and adds optional diagnostics:

- `blockers?: string[]`
- `sourceSignals?: string[]`
- `usedFallback?: boolean`
- `fallbackReason?: "not_configured" | "timeout" | "provider_error" | "parse_failed"`

## What-should-i-do-next real-provider slice (L3)

`POST /functions/what-should-i-do-next` now uses a thin provider-backed path when provider config is available.

- Grounding source:
  - selected item ids (`itemIds`)
  - item title/content/topic and recency
  - latest summary artifacts
  - latest continuation/comment messages
  - linked task and session state signals
- Prompt location:
  - `apps/api/src/services/functions/what-should-i-do-next-prompt.ts`
- Orchestration location:
  - `apps/api/src/services/functions/what-should-i-do-next-llm.ts`

### Fallback policy (L3 what-should-i-do-next only)

The route falls back to existing deterministic synthesis if provider path is unavailable or unsafe:

- provider not configured (`not_configured`)
- timeout (`timeout`)
- provider error (`provider_error`)
- response parse failure (`parse_failed`)
- prompt-grounding assembly failure before provider invocation (`provider_error`)

Additional groundedness guardrail:

- successful provider responses must include at least one `sourceSignals` entry; otherwise the response is treated as parse failure and deterministic fallback is returned (`parse_failed`).
- provider responses are quality-screened before acceptance:
  - summary must overlap grounded item/task/session signal vocabulary
  - suggested action must be concise and single-step (multi-step connectors trigger fallback)
  - low-signal or generic-looking responses are treated as parse failure and deterministic fallback is returned (`parse_failed`).
- provider responses also include `confidence` (`0..1`) for the single next action recommendation.
- deterministic fallback responses include stable default `confidence` (`0.35`) when provider path is unavailable or unsafe.

## LLM safety/logging/failure handling hardening (L4)

L2 + L3 slices now share common fallback classification and normalized logging metadata via:

- `apps/api/src/services/functions/llm-fallback.ts`

### Shared failure classification

Provider/invoke/grounding/parse failures are normalized through one helper:

- `toFallbackReason(code)` maps:
  - `not_configured` -> `not_configured`
  - `timeout` -> `timeout`
  - `provider_error` -> `provider_error`
  - `invalid_response` -> `parse_failed`

### Structured logging fields

Both summarize-progress and next-step now log the same core fields for fallback events:

- `event`
- `correlationId`
- `fallbackReason`
- `fallbackStage` (`grounding` | `invoke` | `parse`)
- `fallbackOrder` (stable ordinal for dashboards)
- `errorCode` (when available from `LlmProviderError`)
- `errorName`
- `durationMs`
