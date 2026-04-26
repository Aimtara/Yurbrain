# Yurbrain Production Readiness Master Plan

_Owner: engineering until named DRI assignment. Status: active hardening plan._

Yurbrain is a continuity engine for the mind, not a dashboard, kanban board, inbox-zero tool, or chatbot wrapper. Production hardening must preserve the product loop:

Capture → Resurface → Continue → Convert → Act → Return

## Current classification

**Strong MVP / pre-production alpha hardening.**

Production is **NO-GO** until security, data lifecycle, quality gates, staging proof, operations, supportability, and controlled rollout evidence are green.

## Launch surface

Default production surface: **web-first**.

Mobile remains **preview/deferred** unless a separate mobile production smoke pass is completed and linked in the release checklist.

## Workstreams

| Workstream | Scope | Initial status |
| --- | --- | --- |
| Security | strict identity, JWT validation, authz matrix, rate limiting, safe errors/logs | Red |
| Platform/Data | schema ownership, storage lifecycle, migrations, backup/restore | Red |
| Product/UX | vision guardrails, calm continuity loop, smoke checklists | Yellow |
| QA/Release | root gates, package parity, CI, release evidence | Red/Yellow |
| Ops/SRE | SLOs, alerts, incident/rollback runbooks, staging realism | Red |
| Compliance/Support | data inventory, vendor/AI disclosure, support and incident comms | Red |

## Phase roadmap

### P0 — Verification and security blocker closure

Exit criteria:
- strict identity mode rejects missing/invalid bearer without falling back to caller-supplied identity;
- web build passes or exact blocker is documented;
- root scripts for security/authz/storage/typecheck/alpha smoke exist;
- local gate evidence is recorded in current verification status.

### P1 — Security and authz enterprise sweep

Exit criteria:
- route-by-route authz matrix covers every production route;
- cross-user denial tests cover core resources;
- rate limits exist for sensitive/expensive route classes;
- security threat model and signoff docs are complete.

### P2 — Data, storage, lifecycle reliability

Exit criteria:
- storage is either fully implemented and smoke-tested, or explicitly deferred from production;
- data lifecycle behavior is documented for core entities;
- migration, rollback, backup, and restore drills are defined and later exercised in staging.

### P3 — Monorepo quality gates and CI/CD

Exit criteria:
- every production-impacting workspace has meaningful or documented lint/typecheck/test/build coverage;
- CI runs frozen install, typecheck, lint, tests, build, security, authz, and storage smoke;
- release evidence is immutable and linked from release docs.

### P4 — Staging operational readiness

Exit criteria:
- staging mirrors production identity/CORS/storage settings where feasible;
- staging smoke pass covers core loop, two-user isolation, and storage if in scope;
- dashboards/alerts and incident/rollback/backup game-days are exercised.

### P5 — Controlled production rollout

Exit criteria:
- founder-only production wave passes objective reliability/security/support gates;
- trusted alpha proceeds only within error budget and without product vision drift;
- rollback and user communication paths are ready before each wave.

## Go/no-go matrix

| Gate | Local | Staging | Production |
| --- | --- | --- | --- |
| Security identity/authz | P0/P1 tests green | real JWT + two-user smoke | no known strict-mode bypass |
| Data/storage | DB tests green; storage decision made | storage lifecycle smoke if in scope | backup snapshot + restore path |
| Quality | full local gate green | CI green | deploy from clean verified artifact |
| Ops | docs complete | alerts/game-days exercised | watch window staffed |
| Product | vision checklist passes | web smoke validates calm loop | no dashboard/kanban/chatbot drift |
| Support | docs drafted | escalation dry-run | comms templates ready |

## Evidence policy

Every green gate must link to command output, CI logs, smoke notes, screenshots/video, or signed runbook entries. A checked box without evidence remains yellow.
