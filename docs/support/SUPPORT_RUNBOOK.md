# Support Runbook

Status: alpha baseline. Must be rehearsed before trusted alpha.

## Support intake

Supported intake sources for early waves:

- founder/internal Slack or equivalent private channel,
- support email once configured,
- incident bridge for SEV1/SEV2 issues,
- GitHub issue only for engineering follow-up, never for raw user secrets/content.

## Triage steps

1. Confirm user identity without asking for passwords, tokens, or secrets.
2. Record affected surface: auth, capture, feed, item detail, comment/AI, task/session, Explore, storage, billing/admin, other.
3. Determine severity using `docs/support/SEVERITY_MATRIX.md`.
4. Check known issues before escalating.
5. If user content is needed for debugging, ask for minimum safe reproduction details; avoid copying raw memories into broad channels.
6. Escalate security/data exposure concerns immediately as incident candidates.

## Escalation

| Category | Primary owner | Escalation |
| --- | --- | --- |
| Auth/security | Engineering/security DRI | SEV1/SEV2 incident path |
| Data loss/corruption | Platform/data DRI | Backup/restore DRI |
| Core loop broken | Product/engineering DRI | Release rollback DRI |
| Storage | Platform/storage DRI | Defer feature if launch wave is active |
| AI fallback/provider | AI/platform DRI | Keep deterministic fallback enabled |

## Support principles

- Never request passwords, JWTs, admin secrets, or raw database dumps from users.
- Prefer minimal screenshots or sanitized reproduction steps.
- Do not promise production readiness or compliance certifications.
- Keep Yurbrain language calm: no guilt, urgency theater, or taskification pressure.
