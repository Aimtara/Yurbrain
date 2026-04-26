# Yurbrain Enterprise Release Board

_Status: active alpha-hardening board. Production remains no-go until every P0/P1/P2/P3/P4 gate has evidence._

This board is the workstream-level operating view for enterprise production readiness. It is intentionally not a user-facing product dashboard.

## Launch surface decision

- **Default launch surface:** web-first.
- **Mobile:** preview/deferred until mobile smoke evidence is completed.
- **Attachments/storage:** production-deferred unless a full upload/read/list/delete lifecycle is implemented and proven.

## Workstreams

| Workstream | Owner | Current status | Evidence source | Next gate |
| --- | --- | --- | --- | --- |
| Security | Engineering DRI pending | Yellow | Strict identity, JWT, authz, rate-limit tests pass locally | Staging real-JWT/two-user smoke |
| Platform/Data | Engineering DRI pending | Yellow/Red | Local DB lifecycle, storage metadata, backup/restore smoke | Storage launch decision and staging restore drill |
| Product/UX | Product DRI pending | Yellow | Vision guardrails and production-deferred storage affordances | Web manual smoke evidence |
| QA/Release | QA/Release DRI pending | Yellow | Local `check:production-safety` and CI workflow defined | Latest CI green run retained |
| Ops/SRE | Ops DRI pending | Red/Yellow | SLO/runbooks and health/readiness smoke | Alert, rollback, incident game-day |
| Compliance/Support | Support DRI pending | Yellow | Data/vendor/privacy/secrets/support docs exist | Workflow dry-run and customer-facing policy review |

## Milestone board

| Milestone | Status | Exit criteria | Evidence |
| --- | --- | --- | --- |
| P0 — Local verification/security blockers | Complete locally | strict identity fixed, web build passes, scripts exist, local gate recorded | `docs/readiness/CURRENT_VERIFICATION_STATUS.md` |
| P1 — Security/authz sweep | Mostly complete locally | authz matrix, denial tests, rate limiting, threat model | `docs/security/AUTHZ_SWEEP.md`, `docs/security/RATE_LIMITING.md` |
| P2 — Data/storage lifecycle | Partial | storage deferred or proven, lifecycle docs, local restore drill | `docs/storage/STORAGE_LIFECYCLE.md`, backup drill docs |
| P3 — CI/CD quality gates | Partial | CI workflow runs full gate and latest run is green | `.github/workflows/nhost-production-safety.yml` |
| P4 — Staging operational readiness | Blocked | staging signoff, alerts, rollback, restore, incident drills | pending |
| P5 — Controlled rollout | Blocked | founder-only wave gate and support readiness | pending |

## Current blockers

1. Staging signoff packet has no real environment evidence.
2. Attachment object lifecycle is not implemented; production launch must keep it deferred.
3. Backup/restore, rollback, alert, and incident drills are only locally/documentation-proven.
4. Latest CI run must be green and retained for release evidence.
5. Mobile launch is deferred until a separate mobile smoke packet exists.

## Board update rule

Update this board whenever a production gate changes status. A gate can only move to green when it links to command output, CI logs, smoke notes, screenshots/video, or an exercised runbook record.
