# Yurbrain Nhost Launch Day Command + Clickbook

This runbook is the operator sequence for launch day.
Use it with `docs/nhost/production-launch-checklist.md`.

## Repo-aligned operator prerequisites

Run from repo root unless stated otherwise.

1. Install/authenticate the Nhost CLI before the launch window.
   - `command -v nhost`
   - `nhost login`
2. Export the production project identifiers used by the exact commands below.
   - `export RELEASE_BRANCH="<approved-release-branch>"`
   - `export NHOST_SUBDOMAIN="<production-project-subdomain>"`
   - `export NHOST_POSTGRES_URL="<production-public-postgres-url>"`
3. Repository topology for this launch:
   - Hasura/Nhost project config lives in `nhost/config.yaml`.
   - Hasura metadata lives in `nhost/metadata`.
   - SQL migrations live in `packages/db/migrations`.
   - This repository does **not** contain a top-level `functions/` directory. Canonical `/functions/*` endpoints are implemented in `apps/api/src/routes/functions.ts` and ship with the API artifact, so there is no separate `nhost functions deploy` step for this repo.

## Roles

- **Release Lead**: runs commands and makes go/no-go call.
- **Nhost Operator**: performs dashboard verification and platform-side settings.
- **App Operator**: deploys API/web/mobile artifacts.
- **Scribe**: records timestamps, evidence links, and decisions.

## T-60 to T-30 minutes: preflight in repo

From repo root:

1. Ensure clean, expected revision.
   - `git fetch origin "$RELEASE_BRANCH"`
   - `git checkout "$RELEASE_BRANCH"`
   - `git pull origin "$RELEASE_BRANCH"`
   - `git rev-parse --short HEAD`
2. Install dependencies.
   - `pnpm install --frozen-lockfile`
3. Run merge-gate checks.
   - `pnpm check:secrets`
   - `pnpm check:nhost-safety`
   - `pnpm typecheck`
   - `pnpm test:nhost-safety`
   - `pnpm build:nhost-safety`
4. Confirm all commands exit with status `0`.

Go/no-go:

- If any gate fails, stop launch and resolve before continuing.

## T-30 to T-20 minutes: Nhost dashboard click checks

In Nhost dashboard for the **production project**:

1. **Project/Environment**
   - Confirm project ref, region, and production subdomain.
   - Confirm this is not the staging/local project.
2. **Auth providers**
   - Go to Auth settings.
   - Confirm email/password is enabled.
   - Confirm any optional providers are intentionally enabled.
3. **Email templates**
   - Check password reset and verification templates.
   - Confirm links target production domains/deep links only.
4. **Redirect URLs**
   - Verify allowlist includes production web URLs and production mobile callback URLs.
   - Ensure no localhost/staging URLs remain in production allowlist.
5. **Hasura permissions**
   - Open Hasura metadata/permissions console.
   - Confirm `anonymous` has no unintended table access.
   - Confirm `user` role owner predicates and insert presets are present.
6. **Storage buckets**
   - Confirm `avatars`, `capture_assets`, `imports` buckets exist.
   - Confirm private buckets are not public.
   - Confirm MIME/type and size limits match policy.

Go/no-go:

- If any dashboard policy differs from docs, stop and reconcile.

## T-20 to T-10 minutes: backup + migration window

1. Trigger pre-launch backup/snapshot (DB and storage export path per your platform policy).
2. Record backup ID/snapshot timestamp in launch notes.
3. Validate the checked-in Nhost config before touching production.
   - `nhost config validate --subdomain "$NHOST_SUBDOMAIN"`
4. Apply the checked-in production project state to the target Nhost project.
   - `nhost up cloud --subdomain "$NHOST_SUBDOMAIN" --postgres-url "$NHOST_POSTGRES_URL"`
   - This is the repo-aligned launch command for production DB migrations plus Hasura metadata/config sync because Nhost cloud development reapplies tracked config, migrations, and metadata from this repository to the selected project.
5. If the repo-level Nhost config changed and you need a config-only re-apply after the cloud sync, run:
   - `nhost config apply --subdomain "$NHOST_SUBDOMAIN" --yes`
6. Run post-migration sanity checks:
   - core tables present (`profiles`, `brain_items`, `attachments`, `tasks`, `sessions`)
   - expected indexes/permissions metadata present

Go/no-go:

- If migration fails or sanity checks fail, execute rollback section immediately.

## T-10 to T-0 minutes: deploy API/web/mobile

1. Deploy API release artifact for the approved commit SHA.
   - This ships the canonical `/functions/*` endpoints implemented in `apps/api/src/routes/functions.ts`.
   - Do **not** run `nhost functions deploy` for this repository; there is no standalone Nhost `functions/` source tree to deploy separately.
2. Deploy web release artifact for the same SHA.
3. Promote/build mobile release with production `EXPO_PUBLIC_*` values.
4. Verify runtime env injection:
   - Web: only `NEXT_PUBLIC_*` public keys.
   - Mobile: only `EXPO_PUBLIC_*` public keys.
   - API: server-only `NHOST_*` and `NHOST_ADMIN_SECRET`.

Go/no-go:

- If env injection is incorrect (especially secrets in client surfaces), stop and redeploy with corrected envs.

## T+0 to T+20 minutes: smoke test command + click sequence

Run in production immediately after deploy.
Capture correlation IDs from API logs for any failure.

1. **Sign up**
   - Click web/mobile sign-up flow with a fresh test email.
   - Expected: account created; no raw internal error shown.
2. **Sign in**
   - Sign in with the same user.
   - Expected: authenticated surface loads.
3. **Create capture**
   - Create one capture item.
   - Expected: item appears in feed/list/detail.
4. **Upload asset**
   - Upload one permitted file to the capture.
   - Expected: upload succeeds; metadata row linked; access policy matches expected visibility.
5. **Tag capture**
   - Add or update at least one tag/classification.
   - Expected: tag persists after refresh.
6. **Query captures**
   - Filter/search/read to return the new capture.
   - Expected: owner-scoped result appears; no cross-user leak.
7. **Sign out**
   - Sign out from active session.
   - Expected: protected surfaces are gated again.

Completion criteria:

- All 7 steps pass.
- No secret leakage in logs.
- No critical errors in API/Nhost observability stream.

## T+20 to T+30 minutes: final acceptance

1. Confirm smoke pass evidence is documented.
2. Confirm no active sev-1/sev-2 incidents.
3. Mark launch as complete in release channel.

## Rollback quick actions

Trigger rollback immediately if any of these occur:

- Auth outage or persistent sign-in/sign-up failure.
- Permission regression or user-data exposure risk.
- Migration-induced data integrity failure.
- Storage permission misconfiguration exposing private objects.

Rollback sequence:

1. Freeze new deploys.
2. Roll app artifacts back to last known-good release.
3. Rotate impacted secrets if leak suspected.
4. Restore data from pre-launch snapshot when required by incident owner decision.
5. Re-run minimal validation:
   - sign in
   - capture read/write
   - storage read/write for owner
   - sign out
6. Publish incident + rollback status update.

## Required artifacts to capture during launch

- Approved commit SHA.
- CI check links/results for safety gates.
- Nhost settings verification timestamp.
- Backup/snapshot ID.
- Migration execution log.
- Smoke test evidence and operator initials.
- Final go/no-go timestamp.
