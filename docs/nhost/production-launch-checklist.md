# Yurbrain Nhost Production Launch Checklist

Use this as the final go/no-go checklist before launching Yurbrain's Nhost-backed stack to production.

## 0) Release scope and ownership

- [ ] Release owner and backup owner are assigned.
- [ ] Launch window, communication channel, and rollback decision authority are documented.
- [ ] Commit SHA / image tags for web, mobile, and API are frozen for launch.

## 1) Nhost project configuration

- [ ] Production uses a dedicated Nhost project (not shared with local/preview/staging).
- [ ] Project region and subdomain are finalized and match deployment configuration.
- [ ] Environment separation is verified (local, preview, staging, production all isolated).
- [ ] Nhost project settings are exported/snapshotted for change tracking.

## 2) Auth configuration

### Auth providers

- [ ] Email/password auth is enabled.
- [ ] Any additional providers (if used) are enabled only after callback/redirect validation.
- [ ] JWT claims required by Hasura are present (`x-hasura-user-id`, `x-hasura-role`, `x-hasura-allowed-roles`).

### Email templates

- [ ] Verification email template points to production-safe verification flow.
- [ ] Password reset template points to production-safe reset flow.
- [ ] Subject/body branding and support contact info are finalized.
- [ ] Template links do not reference localhost/staging domains.

### Redirect URLs

- [ ] Allowed redirect URL list includes canonical production web URL(s).
- [ ] Allowed redirect URL list includes production mobile deep link callback URL(s).
- [ ] Sign-in, sign-out, password reset, and email verification redirects all resolve correctly.
- [ ] Redirect URL allowlist exactly matches deployed environment variable values.

## 3) Hasura permissions

- [ ] `anonymous` role has no unintended table access.
- [ ] `user` role is owner-scoped (`user_id = X-Hasura-User-Id` or equivalent profile owner rule).
- [ ] Insert presets enforce ownership columns server-side.
- [ ] `service` role access is restricted to server-side workloads only.
- [ ] Permission filter indexes are present and verified on owner-scoped tables.

## 4) Storage bucket permissions

- [ ] Buckets exist and match intended model (`avatars`, `capture_assets`, `imports`).
- [ ] Upload/read/delete permissions follow owner-only rules for private buckets.
- [ ] Public avatar access (if enabled) is explicitly scoped and intentional.
- [ ] MIME type and file size limits are enforced for each bucket.
- [ ] Attachment metadata linkage (`attachments` table) is validated for upload paths.

## 5) Database migrations

- [ ] All required migrations are committed and applied in staging.
- [ ] Migration order is documented and deterministic.
- [ ] No destructive/unreviewed schema changes are included in launch scope.
- [ ] Production migration execution command and operator are pre-assigned.
- [ ] Post-migration schema sanity checks are documented and ready.

## 6) Seed data

- [ ] Production runtime does not depend on local/dev seed assumptions.
- [ ] If seed data is needed (for non-user-facing bootstrap), it is idempotent and reviewed.
- [ ] Seed scripts are never run in production without explicit approval.
- [ ] Staging seed data supports final QA smoke coverage.

## 7) Backup and export strategy

- [ ] Database backup cadence and retention policy are documented.
- [ ] Storage object backup/export policy is documented.
- [ ] Pre-launch point-in-time backup (or equivalent snapshot) is completed.
- [ ] Restore drill is validated in a non-production environment.
- [ ] Recovery time objective (RTO) and recovery point objective (RPO) are agreed.

## 8) Staging verification gate

- [ ] Staging environment mirrors production auth, permissions, storage, and env topology.
- [ ] Latest migrations are applied and validated in staging.
- [ ] End-to-end smoke plan (below) passes in staging with evidence captured.
- [ ] Observability confirms safe structured logs and no secret leakage.
- [ ] Launch blockers are resolved or explicitly accepted by release owner.

## 9) Production environment variables

- [ ] Web production env contains only required public keys (`NEXT_PUBLIC_*`) and no secrets.
- [ ] Production web includes:
  - [ ] `NEXT_PUBLIC_NHOST_BACKEND_URL` or `NEXT_PUBLIC_NHOST_SUBDOMAIN` + `NEXT_PUBLIC_NHOST_REGION`
  - [ ] `NEXT_PUBLIC_NHOST_ANON_KEY`
  - [ ] Auth redirect vars (`NEXT_PUBLIC_NHOST_*_REDIRECT_URL`)
- [ ] API production env contains required server-only `NHOST_*` variables.
- [ ] `NHOST_ADMIN_SECRET` is present only in server secret manager/runtime.
- [ ] Deprecated aliases (if still present) are controlled and not duplicated inconsistently.

## 10) Mobile build environment variables

- [ ] Production mobile build uses only `EXPO_PUBLIC_*` keys.
- [ ] Mobile build includes:
  - [ ] `EXPO_PUBLIC_NHOST_BACKEND_URL` or `EXPO_PUBLIC_NHOST_SUBDOMAIN` + `EXPO_PUBLIC_NHOST_REGION`
  - [ ] `EXPO_PUBLIC_NHOST_ANON_KEY`
  - [ ] `EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL`
  - [ ] Auth redirect vars (`EXPO_PUBLIC_NHOST_*_REDIRECT_URL`)
- [ ] No admin secret or server token appears in mobile env/build pipeline.

## 11) API secrets and server credentials

- [ ] `NHOST_ADMIN_SECRET` is rotated per policy before or at launch window.
- [ ] API secret injection is via secure runtime secret manager only.
- [ ] Secret access is least-privilege and audited.
- [ ] Raw auth headers/tokens/admin secrets are not logged.
- [ ] Emergency secret rotation procedure is documented and tested.

## 12) CI checks

- [ ] CI workflow `Nhost Production Safety` is green on the release commit.
- [ ] `pnpm check:nhost-safety` passes.
- [ ] `pnpm typecheck` status is reviewed (known exceptions explicitly tracked).
- [ ] `pnpm lint` passes.
- [ ] `pnpm test:nhost-safety` passes.
- [ ] `pnpm build:nhost-safety` status is reviewed (known exceptions explicitly tracked).

## 13) Smoke tests (short plan)

Run in staging first, then immediately post-production deploy.

1. **Sign up**
   - [ ] Create a new user account via web or mobile.
   - [ ] Verify account creation succeeds and session state is consistent.
2. **Sign in**
   - [ ] Sign in with the created account.
   - [ ] Verify authenticated app surface loads.
3. **Create capture**
   - [ ] Create one capture item.
   - [ ] Verify capture appears in feed/list/detail.
4. **Upload asset**
   - [ ] Upload one valid file to capture flow.
   - [ ] Verify storage object is accessible only as intended and metadata is linked.
5. **Tag capture**
   - [ ] Add/update at least one tag/classification on the capture.
   - [ ] Verify tag persists and is visible in detail/list views.
6. **Query captures**
   - [ ] Run a query/filter/read operation returning the created capture.
   - [ ] Verify owner-scoped data is returned correctly.
7. **Sign out**
   - [ ] Sign out from the active session.
   - [ ] Verify protected routes/screens are gated again.

Pass criteria:

- [ ] All 7 smoke flows pass in staging.
- [ ] All 7 smoke flows pass in production.
- [ ] Any failures are triaged with correlation IDs and resolved or rolled back.

## 14) Rollback plan

- [ ] Rollback trigger conditions are defined (for example: auth outage, permission regression, data integrity risk).
- [ ] Rollback execution owner is assigned.
- [ ] Application rollback path is defined (revert deployment to previous known-good release).
- [ ] Data rollback strategy is defined (restore from pre-launch backup/snapshot where needed).
- [ ] Migration rollback approach is documented (forward-fix vs restore, with decision criteria).
- [ ] Communication plan is prepared for incident/rollback updates.
- [ ] Post-rollback validation checklist is ready (auth, captures, storage, permissions, sessions).

## Related references

- `docs/nhost/environments.md`
- `docs/nhost/auth.md`
- `docs/nhost/permissions.md`
- `docs/nhost/storage.md`
- `docs/nhost/production-safety-checks.md`
- `docs/nhost/observability.md`
