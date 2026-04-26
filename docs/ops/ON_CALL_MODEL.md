# Yurbrain On-Call Model

_Status: draft for founder-only/trusted-alpha operations._

## Coverage model

Yurbrain must not enter production without a named release owner and incident
responder for the launch wave.

| Role | Responsibility | Required before production |
| --- | --- | --- |
| Release owner | Owns go/no-go, deployment window, rollback decision | Named |
| Incident commander | Coordinates SEV1/SEV2 response | Named |
| Engineering responder | API/web/storage/auth triage | Named |
| Product/support responder | User comms, known issues, product guardrail review | Named |
| Security reviewer | Authz, secrets, incident escalation | Named for trusted alpha+ |

## Response expectations

| Wave | Coverage expectation |
| --- | --- |
| Founder-only | Best-effort named responder during watch window |
| Trusted alpha | Business-hours responder plus launch watch windows |
| Broader alpha | Documented rotation and escalation path |
| Beta/production | Formal rotation, paging, and backup responder |

## Escalation

Escalate immediately to SEV1/SEV2 when:

- cross-user data access is suspected,
- strict auth is bypassed,
- storage object isolation fails,
- a migration causes data loss/corruption,
- production is unavailable for a sustained period,
- user content or secrets appear in logs.

