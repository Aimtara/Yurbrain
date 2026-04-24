# Yurbrain Nhost Production Launch Checklist

Use this checklist as the final release gate for Yurbrain's Nhost-backed production launch.

## How to use this checklist

- Keep all items unchecked until verified.
- Fill every row with:
  - `Owner` (person accountable)
  - `Status` (`[ ]` or `[x]`)
  - `Date completed` (UTC date)
  - `Evidence` (PR link, runbook, dashboard screenshot, log snippet, command output)

| Release metadata | Value |
|---|---|
| Target release tag/SHA |  |
| Planned launch window (UTC) |  |
| Release owner |  |
| Backup owner |  |
| Rollback decision owner |  |

---

## Readiness gates

### MVP readiness criteria

| Criteria | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Core auth loop works (sign in, sign out, session restore) |  | [ ] |  |  |
| Capture-to-feed-to-detail loop works for primary content types |  | [ ] |  |  |
| AI endpoints return valid outputs or graceful fallbacks |  | [ ] |  |  |
| Keyword/filter search is reliable and user-scoped |  | [ ] |  |  |

### Alpha readiness criteria

| Criteria | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| `pnpm check:alpha` passes on release candidate |  | [ ] |  |  |
| `pnpm check:alpha-smoke` passes on release candidate |  | [ ] |  |  |
| Manual web + mobile smoke tests pass and are documented |  | [ ] |  |  |
| Cross-user data isolation verified in staging with 2 real users |  | [ ] |  |  |

### Production readiness criteria

| Criteria | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| All sections in this production checklist are complete |  | [ ] |  |  |
| Staging smoke tests pass on production-candidate build |  | [ ] |  |  |
| Production post-deploy smoke tests pass |  | [ ] |  |  |
| Incident response + rollback execution runbooks are confirmed |  | [ ] |  |  |

---

## 1) Nhost project configuration

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Dedicated production Nhost project is used (no shared lower env project) |  | [ ] |  |  |
| Subdomain/region are final and match deployment configs |  | [ ] |  |  |
| Local/preview/staging/production are isolated |  | [ ] |  |  |
| Nhost project settings are exported/snapshotted for change tracking |  | [ ] |  |  |

## 2) Auth providers

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Email/password provider enabled and validated |  | [ ] |  |  |
| Any social/OAuth providers are intentionally enabled and validated |  | [ ] |  |  |
| JWT claims required by Hasura are present (`x-hasura-user-id`, roles) |  | [ ] |  |  |

## 3) Email templates

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Verification template points to production-safe verification flow |  | [ ] |  |  |
| Password reset template points to production-safe reset flow |  | [ ] |  |  |
| Branding/support contacts are finalized |  | [ ] |  |  |
| Templates contain no localhost/staging links |  | [ ] |  |  |

## 4) Redirect URLs

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Production web redirect URLs are allowlisted |  | [ ] |  |  |
| Production mobile deep-link redirects are allowlisted |  | [ ] |  |  |
| Sign-in/sign-out/reset/verification redirect behavior is validated |  | [ ] |  |  |
| Redirect allowlist exactly matches deployed env vars |  | [ ] |  |  |

## 5) CORS/domain settings

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| API allowed origins are explicitly defined for production domains |  | [ ] |  |  |
| Wildcard CORS usage is reviewed and restricted for production |  | [ ] |  |  |
| Web/mobile domain and deep-link allowlists match Nhost/Auth settings |  | [ ] |  |  |
| Cross-origin auth/session behavior validated on production domains |  | [ ] |  |  |

## 6) Hasura permissions

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| `anonymous` role has no unintended table access |  | [ ] |  |  |
| `user` role owner-scoped permissions are validated (`X-Hasura-User-Id`) |  | [ ] |  |  |
| Insert/update presets enforce claim-based ownership fields |  | [ ] |  |  |
| Protected tables verified (`profiles`, `brain_items`, `attachments`, `item_artifacts`, `item_threads`, `thread_messages`, `feed_cards`, `tasks`, `sessions`, `events`, `user_preferences`) |  | [ ] |  |  |
| Permission/index and metadata drift checks are complete |  | [ ] |  |  |

## 7) Storage bucket permissions

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Buckets exist as intended (`avatars`, `capture_assets`, `imports`) |  | [ ] |  |  |
| Bucket rules match `docs/nhost/storage.md` exactly |  | [ ] |  |  |
| Bucket privacy/owner-scope behavior is validated |  | [ ] |  |  |
| MIME allowlists and size limits are configured per bucket |  | [ ] |  |  |
| Object keys enforce owner namespace (`user/{user_id}/...`) |  | [ ] |  |  |
| Attachment metadata FK/row-level ownership constraints are validated |  | [ ] |  |  |
| Two-user upload/read/delete/list isolation smoke passes |  | [ ] |  |  |

## 8) Database migrations

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Required migrations are committed and applied in staging |  | [ ] |  |  |
| Migration order is deterministic and documented |  | [ ] |  |  |
| No unreviewed destructive migration is in release scope |  | [ ] |  |  |
| Production migration execution command/operator are assigned |  | [ ] |  |  |
| Post-migration schema sanity checks are ready and verified |  | [ ] |  |  |

## 9) Seed/backfill strategy

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Production runtime does not depend on dev seed assumptions |  | [ ] |  |  |
| Required bootstrap/backfill jobs are documented and idempotent |  | [ ] |  |  |
| Backfill execution order, ownership, and rollback implications are defined |  | [ ] |  |  |
| Staging data shape is representative enough for smoke and load checks |  | [ ] |  |  |

## 10) Backup and restore

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Database backup cadence/retention policy is active |  | [ ] |  |  |
| Storage backup/export policy is active |  | [ ] |  |  |
| Pre-launch snapshot/backups are captured |  | [ ] |  |  |
| Restore drill is validated in non-production environment |  | [ ] |  |  |
| RTO/RPO targets are documented and accepted |  | [ ] |  |  |

## 11) Secret rotation

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| `NHOST_ADMIN_SECRET` rotation window and owner are defined |  | [ ] |  |  |
| API secret injection path uses secure secret manager only |  | [ ] |  |  |
| Secret access is least-privilege and audited |  | [ ] |  |  |
| Emergency secret rotation runbook is tested and documented |  | [ ] |  |  |

## 12) Web deployment env vars

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Only `NEXT_PUBLIC_*` values are exposed in web runtime |  | [ ] |  |  |
| Required Nhost addressing vars are present (`NEXT_PUBLIC_NHOST_*`) |  | [ ] |  |  |
| Required anon key is present (`NEXT_PUBLIC_NHOST_ANON_KEY`) |  | [ ] |  |  |
| Web auth redirect env vars are present and validated |  | [ ] |  |  |

## 13) Mobile build env vars

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Only `EXPO_PUBLIC_*` values are used in mobile builds |  | [ ] |  |  |
| Required Nhost addressing vars are present (`EXPO_PUBLIC_NHOST_*`) |  | [ ] |  |  |
| Required anon key is present (`EXPO_PUBLIC_NHOST_ANON_KEY`) |  | [ ] |  |  |
| Deep-link base URL and auth redirect env vars are validated |  | [ ] |  |  |
| No server/admin secret appears in mobile pipeline |  | [ ] |  |  |

## 14) API deployment env vars

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Required server-only `NHOST_*` vars are present |  | [ ] |  |  |
| Admin secret is server-side only (never in client env files) |  | [ ] |  |  |
| Issuer/audience/JWKS auth settings are validated in production-like env |  | [ ] |  |  |
| `API_ALLOWED_ORIGINS` / `YURBRAIN_ALLOWED_ORIGINS` are explicit and contain no wildcard fallback for staging/production |  | [ ] |  |  |
| Legacy aliases (if present) are consistent and intentionally retained |  | [ ] |  |  |

## 15) CI checks

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| `Nhost Production Safety` workflow is green on release commit |  | [ ] |  |  |
| `pnpm check:nhost-safety` passes |  | [ ] |  |  |
| `pnpm check:production-safety` passes |  | [ ] |  |  |
| `pnpm check:alpha` passes |  | [ ] |  |  |
| `pnpm check:alpha-smoke` passes |  | [ ] |  |  |

## 16) Staging smoke tests

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Staging mirrors production topology/config |  | [ ] |  |  |
| Auth loop passes (signup/signin/verify/reset/signout/session restore) |  | [ ] |  |  |
| Capture/feed/detail/search/AI smoke suite passes |  | [ ] |  |  |
| Security/isolation smoke checks pass (unauth + invalid token + cross-user) |  | [ ] |  |  |
| All staging blockers are resolved or explicitly accepted |  | [ ] |  |  |

## 17) Production smoke tests

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Immediate post-deploy auth smoke passes |  | [ ] |  |  |
| Capture/feed/detail/search smoke passes with production endpoints |  | [ ] |  |  |
| AI fallback and success-path spot checks pass |  | [ ] |  |  |
| Storage upload/access smoke passes |  | [ ] |  |  |
| Production smoke evidence is archived in release notes/runbook |  | [ ] |  |  |

## 18) Monitoring/logging

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Dashboards/alerts exist for auth failure rates and 5xx rates |  | [ ] |  |  |
| Structured logs include request/correlation IDs across API paths |  | [ ] |  |  |
| Logging redaction rules verified (no tokens/passwords/admin secrets/raw auth headers/private capture bodies) |  | [ ] |  |  |
| On-call can trace incidents from user report to correlated logs |  | [ ] |  |  |

## 19) Incident response

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Incident severity matrix and escalation path are documented |  | [ ] |  |  |
| Communications templates/channels are prepared |  | [ ] |  |  |
| On-call roster and handoff coverage are confirmed for launch window |  | [ ] |  |  |
| Runbooks exist for auth outage, permission leak, storage failure, migration failure |  | [ ] |  |  |

## 20) Rollback plan

| Item | Owner | Status | Date completed | Evidence |
|---|---|---|---|---|
| Rollback trigger conditions are explicitly defined |  | [ ] |  |  |
| Application rollback path to known-good release is validated |  | [ ] |  |  |
| Data rollback strategy (restore/forward-fix decision criteria) is documented |  | [ ] |  |  |
| Migration rollback strategy is documented and tested where possible |  | [ ] |  |  |
| Post-rollback validation checklist is ready and owned |  | [ ] |  |  |

---

## Related references

- `docs/nhost/environments.md`
- `docs/nhost/auth.md`
- `docs/nhost/permissions.md`
- `docs/nhost/storage.md`
- `docs/nhost/production-safety-checks.md`
- `docs/nhost/observability.md`
- `docs/nhost/launch-day-command-clickbook.md`
- `docs/qa/alpha-smoke-execution-report-template.md`
- `docs/nhost/staging-production-smoke-report-template.md`
- `docs/nhost/backup-restore-drill-runbook.md`
- `docs/nhost/secret-rotation-validation-runbook.md`
- `docs/nhost/incident-response-readiness-runbook.md`
- `docs/qa/alpha-smoke-test.md`
