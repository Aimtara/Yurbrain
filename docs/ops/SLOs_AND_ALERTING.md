# Yurbrain SLOs and Alerting Baseline

_Status: Draft baseline. Targets are required for staging signoff; dashboards/alerts are not yet exercised._

## Service objectives

| Surface | Target | Status |
| --- | --- | --- |
| API availability | 99.5% for trusted alpha, reviewed before broader alpha | Defined, not measured in staging |
| Web availability | 99.5% for web-first alpha | Defined, not measured in staging |
| Mobile availability | Preview only until mobile launch scope is approved | Deferred |

## Latency targets

| Route class | p95 target | Examples |
| --- | --- | --- |
| `read_standard` | <= 500 ms | brain item read, preferences, task/session list |
| `write_standard` | <= 750 ms | capture, comments, task/session transitions |
| `feed` | <= 1000 ms | Focus Feed list/refresh |
| `ai_expensive` | <= 2500 ms including fallback | summarize, classify, query, convert |
| `storage` | <= 1500 ms API-side excluding object transfer | attachment metadata/read/list/delete |
| `diagnostics_sensitive` | <= 2000 ms | founder review diagnostics |

## Alert thresholds

| Signal | Threshold | Required action |
| --- | --- | --- |
| API 5xx rate | > 2% over 5 minutes | Triage SEV2; rollback if deploy-related |
| API availability | < target over 15 minutes | Open incident and notify launch owner |
| p95 latency | route class exceeds target for 10 minutes | Check DB/API/AI/storage dependencies |
| Auth failures | sudden 3x baseline increase | Review identity provider, CORS, token validation |
| Rate-limit events | sudden 3x baseline increase | Check abuse vs broken client loop |
| AI fallback spike | > 25% of AI requests for 15 minutes | Verify provider config and timeout behavior |
| Storage errors | > 5% storage route failures for 10 minutes | Pause storage rollout if in scope |
| DB errors | any sustained DB error burst | Check migration/connection/runtime state |

## Required request telemetry

Every API request should be observable with:

- correlation ID,
- route/method/status,
- duration,
- safe current-user reference when authenticated,
- error code on failure,
- no raw bearer tokens,
- no secrets,
- no unnecessary raw user content.

Current status: request correlation/redaction exists in the API baseline; metric dashboards and alert wiring still require staging implementation.

## Production no-go

Production remains no-go until:

1. dashboards exist for all alert thresholds,
2. at least one alert test is recorded,
3. staging smoke results are linked from the signoff packet,
4. rollback and incident drills are recorded.
