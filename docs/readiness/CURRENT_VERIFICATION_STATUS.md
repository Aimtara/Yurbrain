# Current Verification Status

_Last updated: 2026-04-26._

## Production readiness verdict

**Production is NO-GO.** Yurbrain remains a strong MVP / pre-production alpha hardening codebase until P0 verification is green and staging/operational/storage evidence exists.

## Current gate summary

| Area | Status | Evidence / current truth | Next required proof |
| --- | --- | --- | --- |
| Strict identity | Red | Latest known verification reported `401` expected but `200` returned when strict mode lacked bearer identity. Audit found API bearer validation exists, but per-request strict headers are not yet enforced against test header fallback. | Fix strict fallback bypass and rerun auth regression suite. |
| Web build | Yellow | Latest known verification reported `apps/web/app/layout.tsx` could not resolve `@nhost/nextjs`. Current source no longer imports `@nhost/nextjs`; it uses internal `WebNhostProvider`. | Rerun `pnpm build` / `pnpm --filter web build`. |
| Root scripts | Yellow | `typecheck`, `check:alpha-smoke`, and `check:production-safety` currently exist. Requested aliases `check:security`, `check:authz-smoke`, and `check:storage-smoke` are missing; `turbo.json` lacks `typecheck`. | Add/normalize scripts and rerun root gates. |
| Package quality parity | Yellow/Red | API/web/mobile have typecheck coverage. Several packages lack typecheck/lint/build scripts or explicit no-op rationale. | Add meaningful scripts or documented no-ops. |
| Storage lifecycle | Red | Attachment metadata/schema and Nhost docs exist, but no repository API upload/read/list/delete lifecycle is proven. | Implement lifecycle or explicitly defer/hide from production. |
| Staging proof | Red | No current staging signoff packet with smoke evidence is present. | Run web-first staging smoke before production. |
| Ops readiness | Red | Nhost runbooks exist, but canonical SLO/alert/incident/rollback/backup drills are not exercised. | Complete and exercise ops runbooks. |
| Product vision guardrails | Yellow | Existing docs align with continuity-first product vision. | Gate release checklist against canonical guardrails. |

## Answers to current-state questions

1. **What works today?** Core loop API persistence, deterministic AI fallback, web full-loop surface, mobile preview surface, JWT scaffolding, CORS hardening tests, disabled `/events` raw endpoint, and substantial API tests.
2. **What failed in latest verification?** Strict identity returned `200` instead of `401`, web build previously failed on `@nhost/nextjs`, and root verification scripts were reported missing/mismatched.
3. **What production gates are red/yellow/green?** No pillar is fully green. Security, ops, data/storage, compliance, and support are red. Vision fidelity and web-first reliability are yellow. Production is no-go.
4. **Which packages lack lint/typecheck/test/build coverage?** See `docs/dev/current-state.md`; package quality parity is uneven and will be normalized in P0/P3.
5. **Which routes rely on legacy/caller-supplied user identity?** Runtime routes call `requireCurrentUser`; legacy `x-yurbrain-user-id` fallback is test/local-only but must be disabled by explicit strict mode. Query/body/path `userId` is not an identity source.
6. **Which user-owned resources lack cross-user denial tests?** High-value tests exist for brain items, AI, feed listing, and tasks. Additional denial coverage is needed for feed mutations, threads/messages, sessions, preferences, Explore, founder diagnostics, and attachments if enabled.
7. **Which storage flows are incomplete or unproven?** Upload, read/download, list, delete, deleted-read denial, object/metadata consistency, MIME/size rejection, provider error handling, and two-user object isolation are unproven.
8. **Which operational procedures exist only as docs and have not been exercised?** Backup/restore, rollback, incident simulation, alert firing, staging smoke, production post-deploy smoke, and controlled rollout wave gates.
9. **What is the first production surface?** Web-first. Mobile remains preview/deferred until parity smoke evidence exists.
10. **What is the minimal controlled production rollout path?** Founder-only web production after P0/P1/P2/P3/P4 gates, then trusted cohort, limited alpha, expanded alpha, and beta only after reliability/product/support evidence.

## Commands to rerun for P0 evidence

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

## Latest execution evidence

Pending. This document must be updated after the P0 commands above are run.
