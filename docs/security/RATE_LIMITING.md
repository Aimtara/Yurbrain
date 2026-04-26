# Yurbrain Rate Limiting Baseline

_Status: alpha hardening baseline. In-process limiter implemented for local/single-process alpha; distributed production requires a shared backing store._

## Policy

Rate limits protect Yurbrain's continuity loop from accidental client loops, expensive AI/feed work, and abuse without adding friction to normal capture and return behavior.

Limits are enforced by route class:

| Class | Examples | Default window | Default max |
| --- | --- | --- | --- |
| `auth_sensitive` | `/auth/me` | 60s | 120 |
| `read_standard` | item reads, lists, preferences | 60s | 600 |
| `write_standard` | capture, comments, tasks, sessions, feed actions | 60s | 180 |
| `feed` | feed list/refresh/generate | 60s | 120 |
| `ai_expensive` | summarize, classify, query, convert, synthesis | 60s | 60 |
| `storage_write` | attachment/storage routes when added | 60s | 60 |
| `diagnostics_sensitive` | founder review/diagnostics | 60s | 30 |

## Identity keying

- Authenticated requests are keyed by `user:{currentUser.id}`.
- Unauthenticated requests are keyed by `ip:{request.ip}`.
- A valid bearer user and another valid bearer user do not share quotas.
- Missing/invalid bearer requests cannot use `x-yurbrain-user-id` to choose a quota key in strict mode.

## Failure behavior

When a limit is exceeded, the API returns:

- status `429`,
- safe error code `RATE_LIMIT_EXCEEDED`,
- `Retry-After`,
- `X-RateLimit-Limit`,
- `X-RateLimit-Remaining`,
- `X-RateLimit-Reset`.

No token, secret, or raw user content is included in the error body.

## Environment controls

Configurable environment variables:

- `YURBRAIN_RATE_LIMIT_ENABLED` (`1`/`0`, default enabled)
- `YURBRAIN_RATE_LIMIT_WINDOW_MS`
- `YURBRAIN_RATE_LIMIT_<CLASS>_MAX`

Production, staging, and preview environments cannot disable all limits with `YURBRAIN_RATE_LIMIT_ENABLED=0`.

## Production caveat

The current limiter is process-local. It is suitable for local and single-instance alpha evidence, but multi-instance production must replace or back it with shared infrastructure such as Redis, Nhost/Hasura rate controls, API gateway controls, or provider-native WAF/rate-limit rules.

## Test evidence

Automated tests cover:

- exceeding a limit returns `429`,
- separate bearer users do not share quotas,
- unauthenticated requests are keyed by IP,
- staging/production cannot disable all limits accidentally.
