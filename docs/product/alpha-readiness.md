# Alpha readiness

Last updated: 2026-04-30

## Recommendation

Yurbrain is **conditionally alpha-ready for a web-first, founder-only cohort** from a repository-quality perspective. Local quality gates pass on the current checkout; alpha still requires a staging evidence packet, mobile/storage deferral signoff, and a named support owner before launch.

Production remains **NO-GO**.

## What alpha can include

- Web as the primary surface.
- Capture → Focus Feed → item detail → comment/query → Plan This → task/session → return.
- Current-user scoped API access.
- Founder Review and diagnostics as derived safety surfaces, not raw event viewers.
- AI thin slice with bounded context, model routing, artifact cache, and deterministic fallback.
- Mobile as preview/deferred.
- Storage/attachments as deferred; image capture remains URL/reference-only.

## Required alpha evidence

Before alpha launch:

1. Confirm local/CI checks are green on the exact release candidate:
   - `pnpm check:package-boundaries`
   - `pnpm check:authz-smoke`
   - `pnpm check:production-safety`
   - `pnpm test:e2e`
2. Deploy API/web to staging.
3. Run:
   - `pnpm smoke:staging`
   - `pnpm smoke:two-user-isolation`
4. Complete the web core-loop checklist in `docs/readiness/staging-evidence-checklist.md`.
5. Record mobile and storage deferral signoff.
6. Assign support/on-call owner for the alpha window.

## Alpha blockers

- No real staging evidence packet is checked in yet.
- No alert test, rollback rehearsal, or managed backup/restore drill evidence is attached.

## Production blockers

Production requires all alpha evidence plus:

- real two-user isolation proof on deployed staging,
- alert test acknowledgement,
- rollback rehearsal elapsed time,
- backup/restore RTO/RPO evidence,
- production secrets and CORS/JWT/JWKS verification,
- final human go/no-go approval.
