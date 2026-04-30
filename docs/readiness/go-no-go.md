# Yurbrain go / no-go readiness

_Last updated: April 30, 2026 after production-hardening implementation updates._

## April 30 hardening update

This repository now includes canonical production-hardening docs, rate-limit docs, mobile/storage launch-scope decisions, package-boundary docs, LLM cost/cache docs, progressive onboarding docs, and env-driven staging smoke scripts.

New operator evidence entry points:

- `pnpm smoke:staging`
- `pnpm smoke:two-user-isolation`
- `docs/readiness/staging-evidence-checklist.md`
- `docs/readiness/manual-production-tasks.md`

Production remains **NO-GO** until those scripts/checklists are executed against a real staging release candidate and alert, rollback, backup/restore, and launch approval evidence is attached.

This document summarizes the current release gate for MVP, Alpha, and Production using the latest verified code paths, scripts, and manual runbooks. Canonical release criteria now live in:

- `docs/readiness/ENTERPRISE_RELEASE_CRITERIA.md`
- `docs/readiness/CURRENT_VERIFICATION_STATUS.md`
- `docs/readiness/RELEASE_CHECKLIST.md`
- `docs/readiness/STAGING_GATE.md`
- `docs/readiness/PRODUCTION_GATE.md`

## Current status

| Stage | Current status | Notes |
| --- | --- | --- |
| MVP | Conditional go | Core loop code paths are intact and launch-scope decisions are documented; local verification is environment-blocked in this run because Node/pnpm are unavailable in the VM shell. |
| Alpha | Conditional go after staging evidence | Current-user contract closure, event safety, rate-limit docs/tests, package-boundary tooling, LLM bounds/cache, and progressive onboarding are in place. Alpha still requires release-candidate CI plus real staging smoke with two users. |
| Production | No-go | Local/CI production-safety is green, but staging signoff, managed backup/restore, rollback, alerts, and launch approvals are not complete. |

## Commands to run

Run these from a real git checkout with dependencies installed:

1. `pnpm install --frozen-lockfile`
2. `pnpm check:security`
3. `pnpm check:authz-smoke`
4. `pnpm check:storage-smoke`
5. `pnpm check:ops-smoke`
6. `pnpm check:alpha-smoke`
7. `pnpm check:alpha`
8. `pnpm check:production-safety`

If a script fails because the repo is not a git checkout, rerun from a normal clone. The safety scripts intentionally require git metadata to inspect tracked files only.

## MVP readiness criteria

MVP is ready only if all are true:

- `pnpm check:alpha-smoke` passes.
- Web auth works against a real Nhost project.
- Mobile auth and session restore work against the same real Nhost project.
- Capture -> feed -> detail -> AI -> task/session -> search loop works for one real user.
- Known MVP limitations are explicitly accepted and documented.

### Current MVP blockers

- Real web/mobile staging smoke evidence is still required.
- Brain-item delete is still not implemented as a first-class route/UI flow.
- Attachment/storage execution is still metadata/documentation-first rather than a proven end-to-end upload/download/delete flow.

## Alpha readiness criteria

Alpha is ready only if all are true:

- `pnpm check:alpha` passes on the release candidate.
- Staging web/mobile/capture smoke passes using the runbooks in `docs/qa/`.
- Two-user isolation is verified manually and by automated tests.
- Real Nhost-issued JWTs validate in a production-like environment using JWKS + issuer (+ audience when configured).
- Staging dashboard checks for redirects, email templates, storage buckets, and Hasura metadata are recorded.

### Current Alpha blockers

- Real staging environment validation is still outstanding.
- Real Nhost-issued token validation must still be exercised in staging, even though the server path and automated JWKS scaffolding exist.
- Storage bucket/dashboard checks remain partly manual and dashboard-only.
- Delete/storage product behavior still needs explicit acceptance as limitation or implementation follow-up.

## Production readiness criteria

Production is ready only if all are true:

- `pnpm check:production-safety` passes on the release candidate.
- Production/staging envs are configured with explicit API CORS allowlists and verified JWT settings.
- Launch checklist items in `docs/nhost/production-launch-checklist.md` are completed with evidence.
- Backup/restore, rollback, secret rotation, and monitoring runbooks are exercised.
- Post-deploy production smoke passes, including auth, capture, search, AI, and storage checks.

### Current Production blockers

- Staging and production operational validation has not been completed.
- Real storage upload/access/delete flow is not yet proven end-to-end.
- Incident response, monitoring, rollback, and managed staging/production backup evidence are still documentation-first.
- Production launch remains blocked on dashboard-only Nhost checks and post-deploy smoke evidence.

## Manual staging checks required

Use these docs together:

- `docs/qa/staging-manual-qa.md`
- `docs/qa/web-auth-manual-checklist.md`
- `docs/qa/mobile-auth-manual-checklist.md`
- `docs/qa/capture-manual-checklist.md`
- `docs/nhost/staging-production-smoke-report-template.md`

Required staging proof:

- Web auth loop
- Mobile auth/session restore loop
- Capture/feed/detail/search/AI smoke
- Two-user isolation (User A vs User B)
- Dashboard verification of redirects, email templates, storage buckets, Hasura metadata

## Dashboard-only Nhost checks

These remain dashboard/operator checks and must be recorded separately:

- Auth providers enabled as intended
- Redirect allowlists match deployed URLs
- Email templates contain only staging/production-safe links
- Storage bucket existence, privacy, MIME, and size settings
- Hasura metadata/permission alignment and drift checks

## Known remaining blockers / limitations

- Brain-item delete is not currently implemented as a dedicated API/client/UI action.
- Capture attachments/storage are production-deferred; web/mobile upload affordances are hidden/gated by default and no proven upload/download/delete path is present.
- Full staging proof is not yet checked into release evidence.
- Production readiness remains substantially operational rather than purely code-based.
