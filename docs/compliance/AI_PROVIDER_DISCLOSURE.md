# AI Provider Disclosure

Status: alpha governance baseline.

## Current behavior

- Core product AI routes are deterministic/local fallback paths for the MVP loop.
- Selected synthesis functions include provider scaffolding, but real-provider rollout is optional and must remain behind configuration.
- Yurbrain must never require AI to capture, resurface, comment, convert, or act.

## Required disclosure before real-provider rollout

- Provider name and processing region where known.
- Data categories sent to the provider.
- Whether provider training/retention is disabled by contract/config.
- Timeout and fallback behavior.
- User-facing explanation that AI output is source-grounded and optional.
- Operational alert for provider timeout/fallback spikes.

## No-go rules

- Do not silently send broad raw memory history to a provider.
- Do not mutate user memories from AI output without explicit user action.
- Do not claim AI compliance guarantees without legal/vendor review.
- Do not make chatbot UI the primary Yurbrain surface.
