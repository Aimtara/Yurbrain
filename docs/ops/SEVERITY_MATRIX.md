# Yurbrain Severity Matrix

_Status: alpha hardening baseline._

| Severity | Definition | Examples | Response target |
| --- | --- | --- | --- |
| SEV1 | Active or likely broad user data/security incident, total production outage, unrecoverable data loss | cross-user data exposure, leaked admin secret, production API unavailable | Immediate response; pause rollout; executive/customer comms owner assigned |
| SEV2 | Major feature outage or serious degradation for launch cohort | auth outage, capture/feed broken, high 5xx, failed migration with rollback needed | Triage within 30 minutes during launch wave |
| SEV3 | Partial degradation with workaround | AI fallback spike, storage disabled while core loop works, slow feed | Triage same business day |
| SEV4 | Low-impact bug/docs/support issue | copy issue, non-critical smoke checklist gap | Track in known issues |

## Escalation rule

Any suspected cross-user data access, secret exposure, or backup/restore failure starts as SEV1 until disproven.
