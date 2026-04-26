# Yurbrain Controlled Rollout Plan

_Status: required before production; founder-only wave is the first allowed production scope._

## Summary

Yurbrain must launch through deliberately small waves after staging evidence is complete. Reliability, auth isolation, data recovery, and support readiness are gates; additional product features are not a substitute.

## Current production classification

**Yellow: staging hardening.** Production remains **NO-GO** until the staging packet, alert test, rollback rehearsal, backup/restore drill, and support assignments are complete.

## Rollout waves

| Wave | Audience | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| 0. Staging qualification | Internal test users only | Release candidate commit recorded; local + CI gates green | Staging web smoke, strict auth/CORS smoke, two-user isolation smoke, storage decision, alert test, rollback rehearsal, backup/restore drill complete |
| 1. Founder-only production | Founder account(s) only | Signed staging packet and production gate approval | 60-minute watch window stable; no P0/P1 incidents; core loop works |
| 2. Trusted cohort | Named trusted alpha users | Founder-only metrics/support stable; known issues accepted | Auth/support/data reliability remains green across at least one watch window |
| 3. Expanded alpha | Limited invitation group | Trusted cohort stable; support process rehearsed | No unresolved production safety blockers |
| 4. Broader alpha | Larger alpha population | Security/storage/ops evidence remains green and product guardrails still pass | Explicit go decision for broader scope |

## Founder-only watch window

Minimum watch: 60 minutes after deploy.

Track:

- API availability.
- Web availability.
- p95 latency by route class.
- 5xx rate.
- auth failures.
- rate-limit events.
- AI fallback/timeouts.
- storage errors if storage is enabled.
- DB/readiness failures.
- support reports.
- product signal: capture -> feed -> detail/comment -> convert/session.

## Pause or rollback triggers

Pause rollout immediately for:

- missing or invalid strict auth behavior,
- any cross-user data exposure,
- raw event exposure,
- sustained 5xx or readiness failure,
- production login/session failure for launch users,
- storage isolation/lifecycle defect if storage is enabled,
- data corruption or unrecoverable writes,
- product drift into dashboard/kanban/chatbot-first UX.

## Required owners

| Role | Named owner before production |
| --- | --- |
| Release owner | Pending |
| Incident commander | Pending |
| Engineering responder | Pending |
| Product/support responder | Pending |
| Security reviewer | Pending |

## Evidence links

- Staging packet: `docs/qa/STAGING_SIGNOFF_PACKET.md`
- Production gate: `docs/readiness/PRODUCTION_GATE.md`
- Web staging smoke: `docs/qa/WEB_STAGING_SMOKE.md`
- Two-user isolation smoke: `docs/qa/TWO_USER_ISOLATION_SMOKE.md`
- Backup/restore drill: `docs/ops/BACKUP_RESTORE_DRILL.md`
- Rollback runbook: `docs/ops/ROLLBACK_RUNBOOK.md`
