# AI Contracts v1

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

## Fallback policy

- **Summarize:** deterministic preview from source content.
- **Classify:** deterministic heuristic (`question` when `?` present, otherwise `note`).
- **Query:** deterministic acknowledgement echoing the user question.

## Safety guardrails

- All AI responses are validated before persistence.
- Timeout budget defaults to `800ms` and is overridable per request (`timeoutMs`).
- Failed AI calls never block user flow; fallback response is persisted/sent instead.

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

Returned shape remains backward-compatible and adds optional diagnostics:

- `blockers?: string[]`
- `sourceSignals?: string[]`
- `usedFallback?: boolean`
- `fallbackReason?: "not_configured" | "timeout" | "provider_error" | "parse_failed"`
