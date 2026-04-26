# Staging Signoff Packet

Status: **pending**.

Complete this packet before any production approval.

## Environment

- Staging URL:
- API URL:
- Release candidate commit:
- Operator:
- Date:

## Required evidence

| Check | Result | Evidence |
| --- | --- | --- |
| CI production-safety gate | Passed on latest evidenced release-board run; rerun required for final release candidate | GitHub Actions run `24945724345` passed install, typecheck, lint, tests, build, security checks, authz smoke, and storage smoke. |
| Local health/readiness smoke | Passed | `pnpm check:ops-smoke` covers unauthenticated `/health/live` and `/health/ready`; staging must repeat against deployed API. |
| Attachment production scope | Deferred | Storage lifecycle docs and UI tests enforce no production attachment upload claims/affordances by default. |
| Web app loads | Pending | |
| Login with real staging user | Pending | |
| `/auth/me` returns bearer identity | Pending | |
| No-token strict request returns 401 | Pending | |
| Invalid-token strict request returns 401 | Pending | |
| Unknown CORS origin rejected | Pending | |
| Capture note | Pending | |
| Focus card appears | Pending | |
| Open Brain Item Detail | Pending | |
| Add comment | Pending | |
| Ask Yurbrain / summary fallback | Pending | |
| Plan/task conversion | Pending | |
| Start/pause/finish session | Pending | |
| Explore preview/save, if enabled | Pending | |
| Storage lifecycle, if in scope | Pending/deferred | |
| Two-user denial: BrainItem | Pending | |
| Two-user denial: feed/thread/task/session | Pending | |
| Logout/session expiry | Pending | |
| Dashboards visible | Pending | |
| Alert test fired | Pending | |
| Rollback rehearsal | Pending | |
| Backup/restore drill | Pending | |

## Product vision signoff

- [ ] Focus remains home.
- [ ] Capture remains low-friction.
- [ ] Comments remain first-class.
- [ ] AI remains optional and fallback-safe.
- [ ] Tasks remain downstream.
- [ ] No dashboard/kanban/inbox-zero/chatbot-primary drift.

## Known issues accepted for staging

- Native attachment upload/read/list/delete is deferred from web-first production unless separately implemented and smoke-tested.
- Mobile remains preview/deferred unless this packet is expanded with a mobile smoke run.
- Local/CI proof does not replace real staging JWT, CORS, alert, rollback, or backup/restore evidence.

## Signoffs

- Engineering:
- Security:
- Product:
- Ops/support:
