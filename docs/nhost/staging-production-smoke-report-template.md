# Staging + Production Smoke Signoff Template

Use this template to complete and evidence Sections 16 and 17 in `docs/nhost/production-launch-checklist.md`.

Create a release-specific copy before execution, for example:

- `docs/nhost/runs/2026-04-24-staging-production-smoke.md`

## Run metadata

| Field | Value |
|---|---|
| Release SHA/tag |  |
| Staging environment URL(s) |  |
| Production environment URL(s) |  |
| Run date (UTC) |  |
| Release lead |  |
| App operator |  |
| Nhost operator |  |
| Scribe |  |

## Staging smoke (Section 16)

| Checklist item | Status | Evidence |
|---|---|---|
| Staging mirrors production topology/config |  |  |
| Auth loop passes (signup/signin/verify/reset/signout/session restore) |  |  |
| Capture/feed/detail/search/AI smoke suite passes |  |  |
| Security/isolation smoke checks pass (unauth + invalid token + cross-user) |  |  |
| All staging blockers are resolved or explicitly accepted |  |  |

## Production smoke (Section 17)

| Checklist item | Status | Evidence |
|---|---|---|
| Immediate post-deploy auth smoke passes |  |  |
| Capture/feed/detail/search smoke passes with production endpoints |  |  |
| AI fallback and success-path spot checks pass |  |  |
| Storage upload/access smoke passes |  |  |
| Production smoke evidence is archived in release notes/runbook |  |  |

## Required command evidence

| Command | Environment | Status | Evidence |
|---|---|---|---|
| `pnpm check:alpha` | release-candidate |  |  |
| `pnpm check:alpha-smoke` | release-candidate |  |  |
| `pnpm check:production-safety` | release-candidate |  |  |

## Failures and risk acceptance

| ID | Severity | Failure summary | Resolution | Owner | Approved by |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## Final signoff

- Section 16 (Staging smoke) decision: `PASS` / `BLOCKED`
- Section 17 (Production smoke) decision: `PASS` / `BLOCKED`
- Rollback trigger activated: `YES` / `NO`
- Decision owner:
- Timestamp (UTC):
