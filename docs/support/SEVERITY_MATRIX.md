# Support Severity Matrix

Status: alpha support baseline.

| Severity | Definition | Examples | Target response | Escalation |
| --- | --- | --- | --- | --- |
| SEV1 | Security/data incident or service unavailable for launch cohort | suspected cross-user data exposure, auth bypass, major data loss | Immediate during watch window | Engineering + security + launch owner |
| SEV2 | Core loop materially broken for multiple users | capture/feed/detail down, widespread login failure, migration issue | Same business day / active watch | Engineering DRI |
| SEV3 | Degraded feature or isolated user blocker | AI fallback spike, one route class slow, individual account issue | 1-2 business days | Product/support triage |
| SEV4 | Minor issue, docs, polish, accepted limitation | copy issue, known mobile preview gap, deferred attachment UI | Backlog | Product owner |

## Escalation rules

- Treat any suspected cross-user access as SEV1 until disproven.
- Treat any raw event exposure as SEV1.
- Treat attachment/storage access defects as SEV1 if storage is production-enabled.
- Pause rollout waves for unresolved SEV1 or repeated SEV2.
