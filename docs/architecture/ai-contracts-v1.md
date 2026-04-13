# AI Contracts v1

## Envelope (required)

All AI-backed routes use a strict envelope before persistence:

- `content: string` (required, non-empty)
- `confidence: number` in `[0, 1]`
- `metadata: Record<string, unknown>` (optional, defaults to `{}`)

If the model output fails envelope validation or exceeds timeout budget, the API returns a deterministic fallback envelope and marks `fallbackUsed: true` plus `fallbackReason` (`timeout` or `invalid_or_runner_error`).

## Sprint 3 routes

- `POST /ai/summarize` → persists a `summary` artifact.
- `POST /ai/classify` → persists a `classification` artifact.
- `POST /ai/query` → appends both user question and assistant reply into an existing thread.

## Fallback policy

- **Summarize:** deterministic preview from source content.
- **Classify:** deterministic heuristic (`question` when `?` present, otherwise `note`).
- **Query:** deterministic acknowledgement echoing the user question.

## Safety guardrails

- All AI responses are validated before persistence.
- Timeout budget defaults to `800ms` and is overridable per request (`timeoutMs`).
- Failed AI calls never block user flow; fallback response is persisted/sent instead.
