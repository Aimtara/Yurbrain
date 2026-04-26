# Yurbrain Enterprise Release Criteria

_Status: production no-go until every production gate has evidence._

Yurbrain may not be described as enterprise-production-ready until all eight pillars below are green with linked evidence. Web is the first production surface by default. Mobile remains preview unless a separate mobile smoke packet is completed.

## Pillar gate matrix

| Pillar | Production gate | Current status | Required evidence |
| --- | --- | --- | --- |
| 1. Vision fidelity | Focus Feed remains home; Capture is low-friction; comments are first-class; AI is optional; tasks are downstream. | Yellow | Vision guardrails checklist completed during release QA. |
| 2. Security + identity | Verified bearer identity in strict/staging/production; no caller-authoritative ownership; authz on every user-owned resource. | Red | Passing auth/authz smoke, JWT tests, route matrix, and strict-mode fallback denial tests. |
| 3. Operational resilience | SLOs, alerts, incident response, rollback, backup/restore, and correlation IDs are defined and exercised. | Red | Exercised incident simulation, rollback drill, backup/restore drill, and alert test records. |
| 4. Quality gates | All production-impacting workspaces have lint/typecheck/test/build or documented no-op; CI enforces gates. | Red/Yellow | Passing local and CI `check:production-safety`; retained logs/artifacts. |
| 5. Data/storage lifecycle | Data retention, archive/delete, storage lifecycle, migration rollback, and restore are proven. | Red | Storage lifecycle smoke with two users or explicit production deferral; restore drill evidence. |
| 6. Compliance/governance | Data inventory, privacy workflows, vendor inventory, secret inventory, AI disclosure, and access/deletion workflow exist. | Red | Compliance docs completed; no unsupported compliance claims. |
| 7. Multi-surface reliability | Launch surface declared and smoke-tested. | Yellow/Red | Web production smoke packet; mobile packet only if mobile is in launch scope. |
| 8. Supportability | Support triage, severity, known issues, comms templates, user-impact assessment, and escalation paths exist. | Red | Support runbook dry-run and known issue register. |

## Hard no-go criteria

- Any strict/production path accepts header/query/body `userId` without a verified bearer token.
- Any user-owned resource is readable or mutable cross-user without an explicit admin/support authorization model.
- `/events` exposes raw events publicly or without strict user scoping.
- Storage objects can be listed, read, uploaded, or deleted cross-user.
- Web production build fails.
- Root verification scripts are missing or bypass known production-impacting packages without rationale.
- Staging proof is absent.
- Backup/restore or rollback procedure exists only as theory for production-impacting migrations.
- Product hardening changes make Yurbrain dashboard-first, kanban-first, inbox-zero oriented, chatbot-primary, or coercively task-centric.

## Required local gate

```bash
pnpm install
pnpm reset
pnpm seed
pnpm test
pnpm lint
pnpm build
pnpm typecheck
pnpm check:alpha-smoke
pnpm check:security
pnpm check:authz-smoke
pnpm check:storage-smoke
pnpm check:production-safety
```

## Required staging gate

- Deploy staging from an immutable, clean release candidate.
- Verify staging environment variables: CORS origins, JWT issuer/audience/JWKS, API/web URLs, storage, secrets, and functions.
- Run web smoke: auth, capture, feed, item detail, comment, AI fallback/query, plan, task/session, Explore save, logout/session expiry.
- Run two-user isolation smoke.
- Run storage smoke if attachments are production-supported; otherwise confirm storage is deferred/hidden.
- Verify dashboards and alerts.
- Record signoff packet.

## Required production gate

- Staging gate complete.
- Production env audit complete.
- Backup snapshot taken or documented equivalent for current storage model.
- Migration dry-run/staging-first proof complete.
- Rollback plan rehearsed.
- Post-deploy smoke planned with watch window.
- Support owner and incident comms templates ready.

