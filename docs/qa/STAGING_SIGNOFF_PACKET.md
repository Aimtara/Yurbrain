# Staging Signoff Packet

Status: **pending**.

Complete this packet before any production approval.

## Environment

- Staging URL:
- API URL:
- Release candidate commit: `8ae8d635e3fadf63fa0c78e98d1023b04446e622` recorded as current local/CI audit commit; re-record exact commit after final release-candidate cut.
- Operator:
- Date:

## Current local/CI evidence, not staging proof

- Current branch at audit: `main`.
- Current audit commit: `8ae8d635e3fadf63fa0c78e98d1023b04446e622`.
- Working tree at audit: clean.
- Local command run on 2026-04-26:

```bash
pnpm check:production-safety && pnpm test:e2e
```

Result: passed locally with `pnpm test:e2e` reporting `full loop: capture -> feed -> comment/query -> convert -> act`, `pass 1`, `fail 0`.

- CI evidence: GitHub Actions `Nhost Production Safety` run `24948043688` succeeded for commit `8ae8d635e3fadf63fa0c78e98d1023b04446e622`.
- Implementation-branch evidence after quality/preference hardening:
  - `pnpm --filter web test` passed 3/3 web production UX smoke tests.
  - `YURBRAIN_TEST_MODE=1 pnpm --filter api exec tsx --test src/__tests__/sprint17/authz-route-denials.test.ts` passed, including legacy preference path owner-scoping.
  - `pnpm test && pnpm lint && pnpm typecheck && pnpm check:production-safety && pnpm test:e2e` passed locally; final E2E again reported `pass 1`, `fail 0`.

This section is **not** staging signoff. All rows below still require real staging environment evidence with staging URLs, real staging tokens, CORS settings, and operator/date.

## Required evidence

| Check | Result | Evidence |
| --- | --- | --- |
| CI production-safety gate | Passed on current audit commit; rerun required for final release candidate | GitHub Actions run `24948043688` passed install, typecheck, lint, tests, build, security checks, authz smoke, and storage smoke for `8ae8d635e3fadf63fa0c78e98d1023b04446e622`. |
| Local health/readiness smoke | Passed locally | `pnpm check:production-safety` includes `pnpm check:ops-smoke`; staging must repeat against deployed API. |
| Local full-loop e2e | Passed locally | `pnpm test:e2e` reported `full loop: capture -> feed -> comment/query -> convert -> act`, pass 1/fail 0. |
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
