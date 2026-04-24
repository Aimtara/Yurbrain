# Yurbrain Nhost Launch Day Command + Clickbook

This runbook is the operator sequence for launch day.
Use it with `docs/nhost/production-launch-checklist.md`.

## Roles

- **Release Lead**: runs commands and makes go/no-go call.
- **Nhost Operator**: performs dashboard verification and platform-side settings.
- **App Operator**: deploys API/web/mobile artifacts.
- **Scribe**: records timestamps, evidence links, and decisions.

## T-60 to T-30 minutes: preflight in repo

From repo root:

1. Ensure clean, expected revision.
   - `git fetch origin cursor/nhost-monorepo-integration-b697`
   - `git checkout cursor/nhost-monorepo-integration-b697`
   - `git pull origin cursor/nhost-monorepo-integration-b697`
   - `git rev-parse --short HEAD`
2. Install dependencies.
   - `pnpm install --frozen-lockfile`
3. Run merge-gate checks.
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
3. Apply production migrations using your approved production migration command.
4. Run post-migration sanity checks:
   - core tables present (`profiles`, `brain_items`, `attachments`, `tasks`, `sessions`)
   - expected indexes/permissions metadata present

Go/no-go:

- If migration fails or sanity checks fail, execute rollback section immediately.

## T-10 to T-0 minutes: deploy API/web/mobile

1. Deploy API release artifact for the approved commit SHA.
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
