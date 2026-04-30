# LLM cost, latency, and caching

Yurbrain's AI surface remains a bounded continuity aid, not a general chat agent. The production-critical thin slice is limited to existing product flows such as Summarize Progress and What Should I Do Next?

## Provider and routing

The API uses the OpenAI-compatible provider adapter in `apps/api/src/services/ai/provider`.

Configuration:

| Env var | Purpose |
| --- | --- |
| `YURBRAIN_LLM_ENABLED` | Set `0`/`false` to force deterministic fallback. |
| `YURBRAIN_LLM_PROVIDER` | Currently `openai`. |
| `YURBRAIN_LLM_API_KEY` | Provider API key. Never commit it. |
| `YURBRAIN_LLM_BASE_URL` | Optional OpenAI-compatible base URL. |
| `YURBRAIN_LLM_MODEL` | Default model. |
| `YURBRAIN_LLM_FAST_MODEL` | Cheap/fast model for summarization/classification (defaults to `YURBRAIN_LLM_MODEL`). |
| `YURBRAIN_LLM_REASONING_MODEL` | Stronger model for next-step reasoning (defaults to `YURBRAIN_LLM_MODEL`). |
| `YURBRAIN_LLM_DEFAULT_MODEL` | Task-specific override for default task class. |
| `YURBRAIN_LLM_SUMMARIZE_PROGRESS_MODEL` | Task-specific override for Summarize Progress (defaults to fast model). |
| `YURBRAIN_LLM_NEXT_STEP_MODEL` | Task-specific override for What Should I Do Next (defaults to reasoning model). |
| `YURBRAIN_LLM_CLASSIFICATION_MODEL` | Task-specific override for classification (defaults to fast model). |
| `YURBRAIN_LLM_TIMEOUT_MS` | Provider timeout. |
| `YURBRAIN_LLM_MAX_OUTPUT_TOKENS` | Output token ceiling. |
| `YURBRAIN_LLM_TEMPERATURE` | Sampling temperature. |

If the provider is missing, disabled, times out, returns invalid JSON, or fails quality guards, the deterministic fallback remains the user-visible result.

## Context pruning policy

LLM prompts must not include raw full histories. Current synthesis grounding includes only:

- selected item IDs,
- bounded item title/snippet/current `updatedAt`,
- latest summary artifact content where relevant,
- up to six linked tasks and sessions,
- source signals derived from deterministic synthesis,
- at most the last three user/assistant conversational turns per selected item.

System logs record safe metadata such as item count, route class, cache hit/miss, provider/model, and latency. Logs must not include raw prompts, bearer tokens, API keys, or private user content.

## Semantic cache

Summarize Progress and What Should I Do Next use existing `item_artifacts` rows as a semantic cache. No migration is required.

Cache rows:

- use `type: "summary"`,
- store a namespaced payload kind:
  - `summarize_progress_cache`
  - `what_should_i_do_next_cache`
- store a fingerprint and sanitized result,
- are anchored to the first selected item.

The fingerprint is conservative and includes selected item state, relevant linked tasks/sessions, recent message snippets/timestamps, and non-cache summary artifacts. Item, comment, task, or session changes should miss the cache.

## Production requirement

Before production, a human operator must approve provider, model names, budget, alerting, and launch cohort size. Without those approvals and staging evidence, production remains no-go.
