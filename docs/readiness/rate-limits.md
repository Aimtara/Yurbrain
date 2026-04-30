# Rate limits

Last updated: 2026-04-30

Yurbrain enforces API rate limits in the Fastify API before route handlers run. The goal is abuse resistance for identity, write-heavy, analytics, and AI routes without exposing private user data in logs.

## Principal keying

Rate-limit buckets are keyed by:

1. verified/current user ID when request identity is available, or
2. requester IP as a fallback for unauthenticated requests.

Logs record only the principal kind (`user` or `ip`), route class, and normalized route. They do not log bearer tokens, raw prompts, request bodies, or private user content.

## Route classes

| Class | Default per 60s | Examples |
| --- | ---: | --- |
| `auth_sensitive` | 60 | `/auth/me`, `/auth/*` |
| `diagnostics_sensitive` | 20 | `/functions/founder-review`, `/functions/founder-review/diagnostics` |
| `ai_expensive` | 60 | `/ai/*`, `/functions/summarize`, `/functions/classify`, `/functions/query`, `/functions/convert`, `/functions/summarize-progress`, `/functions/what-should-i-do-next` |
| `feed` | 120 | `/feed`, `/feed/*`, `/functions/feed`, `/functions/feed/*` |
| `storage_write` | 30 | `/attachments/*`, `/storage/*` |
| `write_standard` | 120 | non-GET/HEAD/OPTIONS routes not classified above, including capture/tasks/messages |
| `read_standard` | 600 | normal GET/HEAD routes and health checks |

Health probes are intentionally not auth-gated. They are treated as standard reads so infrastructure can probe safely while still receiving rate-limit headers.

## Configuration

| Env var | Meaning |
| --- | --- |
| `YURBRAIN_RATE_LIMIT_DISABLED=1` | Disables limits only in non-production-like environments. Ignored for preview/staging/production. |
| `YURBRAIN_RATE_LIMIT_WINDOW_MS` | Window size in milliseconds. Default: `60000`. |
| `YURBRAIN_RATE_LIMIT_<CLASS>_LIMIT` | Per-class request limit override, for example `YURBRAIN_RATE_LIMIT_AI_EXPENSIVE_LIMIT=30`. |
| `YURBRAIN_RATE_LIMIT_<CLASS>` | Legacy alias for the per-class limit. |

Production-like environments are detected from `NHOST_PROJECT_ENV=preview|staging|production` or `NODE_ENV=production`. In those environments rate limiting cannot be accidentally disabled globally.

## 429 response shape

When throttled, the API returns status `429` with safe error code `RATE_LIMITED` and rate-limit metadata:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please slow down and try again shortly."
  },
  "rateLimit": {
    "class": "ai_expensive",
    "limit": 1,
    "remaining": 0,
    "resetMs": 59999
  }
}
```

The response also includes:

- `x-yurbrain-rate-limit-class`
- `x-yurbrain-rate-limit-limit`
- `x-yurbrain-rate-limit-remaining`
- `x-yurbrain-rate-limit-reset-ms`

## Test evidence

Local automated coverage lives in `apps/api/src/__tests__/sprint17/rate-limit.test.ts` and covers:

- unauthenticated auth-sensitive throttling,
- authenticated per-user quota isolation,
- production-like environments cannot disable all limits,
- AI/function routes receive `ai_expensive` throttling,
- standard write routes receive `write_standard` throttling,
- health probes stay reachable and carry `read_standard` headers.
