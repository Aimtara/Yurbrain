# Yurbrain Release Checklist

_Created: April 26, 2026. Last updated: April 26, 2026._

This checklist prevents production-sensitive releases from being promoted on claims alone. Attach command logs, CI run links, staging smoke notes, screenshots, or incident-drill records before marking any evidence field complete.

## 1. Product vision check

- [ ] Focus Feed remains the home surface.
- [ ] Capture remains save-first and low-friction.
- [ ] Brain Item Detail keeps original context visible.
- [ ] Comments remain easy and first-class.
- [ ] AI remains optional, grounded, explainable, dismissible, and fallback-safe.
- [ ] Tasks/sessions remain downstream conversions, not mandatory processing.
- [ ] Explore remains optional and source-linked.
- [ ] No dashboard-first, kanban-first, inbox-zero, guilt-heavy, or chatbot-primary UX was introduced.

Evidence:

- Product reviewer:
- Notes:

## 2. Local verification gate

Required commands:

- [ ] `pnpm install`
- [ ] `pnpm reset`
- [ ] `pnpm seed`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm check:alpha-smoke`
- [ ] `pnpm check:security`
- [ ] `pnpm check:authz-smoke`
- [ ] `pnpm check:storage-smoke`
- [ ] `pnpm check:production-safety`

Evidence:

- Local run date: 2026-04-26
- Operator: Cursor production-readiness audit agent
- Release candidate/audit commit: `8ae8d635e3fadf63fa0c78e98d1023b04446e622`
- Logs / summary:
  - Local verification evidence only; not staging or production proof.
  - `pnpm check:production-safety && pnpm test:e2e` passed locally with exit 0.
  - E2E final section confirmed `full loop: capture -> feed -> comment/query -> convert -> act`, pass 1, fail 0.
  - Prior local gate evidence also records `pnpm install`, `pnpm reset`, `pnpm seed`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm check:security`, `pnpm check:authz-smoke`, `pnpm check:storage-smoke`, `pnpm check:ops-smoke`, `pnpm check:production-safety`, and `pnpm test:e2e` as passing in local/CI contexts. Re-run for any final release candidate.
  - GitHub Actions `Nhost Production Safety` run `24948043688` passed for commit `8ae8d635e3fadf63fa0c78e98d1023b04446e622`.

## 3. Security gate

- [ ] Strict mode rejects missing bearer token.
- [ ] Strict mode rejects invalid/expired/wrong issuer/wrong audience tokens.
- [ ] Strict mode ignores header/query/body/path user ID spoofing.
- [ ] Production/staging do not allow legacy test header fallback.
- [ ] Route-by-route authz sweep is complete.
- [ ] Cross-user denial smoke passes for all high-risk resources.
- [ ] `/events` remains blocked or is replaced by an authenticated scoped model.
- [ ] CORS allowlist is explicit in staging/production.
- [ ] Secret-leak and Nhost production-safety checks pass.

Evidence:

- Security reviewer:
- Authz smoke output:
- Known exceptions:

## 4. Data and storage gate

- [ ] BrainItem create/update/archive lifecycle is documented.
- [ ] Attachment status is explicitly declared: production-supported or deferred.
- [ ] If supported, storage upload/read/list/delete/cross-user-denial smoke passes.
- [ ] If deferred, UI affordances and launch limitations are documented.
- [ ] Event payload allowlist is documented.
- [ ] Backup/restore drill has evidence.
- [ ] Migration/rollback SOP is current.

Evidence:

- Storage smoke output: local metadata/backup smoke passes via `pnpm check:storage-smoke`; this is not object lifecycle proof.
- Backup/restore drill record: local PGlite metadata backup/restore test passes; staging restore drill remains required.
- Known exceptions: attachment object upload/read/list/delete is deferred for web-first launch unless implemented and smoke-tested.

## 5. Staging gate

- [ ] Staging environment mirrors production-sensitive auth/CORS/storage settings.
- [ ] Web smoke passes.
- [ ] Two-user isolation smoke passes.
- [ ] Storage smoke passes or storage is explicitly deferred.
- [ ] AI fallback and timeout behavior are observed.
- [ ] Dashboards/alerts are configured or launch is blocked.
- [ ] Rollback path is rehearsed.
- [ ] Incident response path is rehearsed.

Evidence:

- Staging signoff packet:
- Watch window:
- Known exceptions:

## 6. Production gate

- [ ] Production environment variable audit complete.
- [ ] Backup/snapshot complete before deploy.
- [ ] Deployment approval recorded.
- [ ] Post-deploy web smoke passes.
- [ ] Monitoring watch window assigned.
- [ ] Rollback owner and command path confirmed.
- [ ] Support/severity/comms runbooks are ready.
- [ ] Launch wave criteria are met.

Evidence:

- Production approver:
- Deploy artifact:
- Post-deploy smoke:

## 7. Final go/no-go decision

| Decision | Allowed when |
| --- | --- |
| No-go | Any P0 security, identity, data-loss, or unverified storage/staging blocker remains. |
| Founder-only | P0 code gates green, staging proof complete, limited blast radius accepted. |
| Trusted alpha | Founder-only metrics stable and support path proven. |
| Broader alpha | Security/storage/ops evidence remains green across prior waves. |

Decision:

- Date:
- Approver:
- Scope:
- Rollback trigger:
