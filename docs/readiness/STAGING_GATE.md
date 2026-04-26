# Yurbrain Staging Gate

Status: **blocked until a staging deployment is exercised with production-like strict settings.**

## Required staging evidence

| Gate | Required evidence | Status |
| --- | --- | --- |
| Strict auth | Real Nhost/JWKS token accepted; no-token/invalid-token rejected | Pending |
| CORS | Explicit staging origins only; unknown origins rejected | Pending |
| Core web loop | Login, capture, feed, detail, comment, AI fallback, plan, task/session | Pending |
| Two-user isolation | User B denied access to User A items/feed/thread/task/session/storage | Pending |
| Storage | Upload/read/list/delete if attachments are in launch scope | Pending/deferred decision |
| Observability | Health, route latency, 5xx/auth/storage/AI fallback metrics visible | Pending |
| Alerts | Test alerts fired and acknowledged | Pending |
| Rollback | Bad deployment rollback rehearsed | Pending |
| Backup/restore | Restore drill completed with measured RTO/RPO | Pending |
| Product guardrails | Focus remains home; no dashboard/kanban/chatbot drift | Pending |

## Signoff rule

Staging signoff requires recorded command logs, screenshots or runbook notes, and known issue links. A successful local build is not staging proof.
