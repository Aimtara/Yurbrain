# Backup + Restore Drill Runbook

Use this runbook to execute and evidence the backup/restore drill required by `docs/nhost/production-launch-checklist.md` section 10.

## Purpose

- Validate that database + storage recovery works before production launch.
- Confirm RTO/RPO assumptions with measured data.
- Capture evidence for release signoff.

## Roles

- **Drill owner**: runs the drill and coordinates timeline.
- **Platform operator**: executes Nhost backup/export/restore actions.
- **App verifier**: runs post-restore functional validation.
- **Scribe**: records times, commands, dashboard screenshots, and outcomes.

## Preconditions

- Staging environment mirrors production schema, permissions, storage buckets, and auth settings.
- Snapshot/export paths are configured and documented.
- Test users exist:
  - User A
  - User B
- A release candidate build is deployed to staging.

## Drill steps

### 1) Baseline capture (T0)

Record before making changes:

- Staging deployment SHA.
- Current migration level.
- Existing backup cadence policy and latest successful backup timestamp.
- Baseline functional checks:
  - Sign in
  - Create capture
  - View feed/detail
  - Upload one storage object

### 2) Trigger backup/snapshot (T1)

In staging:

1. Trigger full database backup/snapshot.
2. Trigger storage export/snapshot for required buckets (`avatars`, `capture_assets`, `imports`).
3. Record backup IDs and completion times.

Required evidence:

- Backup IDs.
- Snapshot completion timestamps.
- Dashboard export/job status screenshots.

### 3) Introduce controlled data delta (T2)

Create post-backup data so restore verification has a clear signal:

1. User A creates one capture and one comment.
2. User B creates one capture.
3. Upload one object to `capture_assets` bucket for User A.

Record IDs for created rows/objects.

### 4) Execute restore (T3)

Restore staging from the T1 snapshot:

1. Restore database snapshot.
2. Restore storage export.
3. Wait for platform readiness confirmation.

Record:

- Restore start/end UTC timestamps.
- Operator name.
- Any warnings/errors reported by platform.

### 5) Post-restore verification (T4)

Run functional checks:

1. Sign in with User A and User B.
2. Verify pre-backup baseline records still exist.
3. Verify post-backup (T2) records are absent (expected rollback point).
4. Verify storage object state matches snapshot point.
5. Run automated safety gate:
   - `pnpm check:alpha-smoke`

Expected:

- Restored environment is internally consistent.
- Auth, capture, feed, detail, search, and security smoke checks pass.

### 6) RTO/RPO report

Compute:

- **Observed RTO** = restore completion time - restore start time.
- **Observed RPO** = latest restored data point timestamp - data loss boundary timestamp.

Compare against target thresholds and mark pass/fail.

## Failure handling

If restore fails or produces inconsistent state:

1. Stop launch readiness progression immediately.
2. Open incident with severity per incident matrix.
3. Preserve logs and job IDs for root-cause analysis.
4. Re-run drill after remediation.

## Evidence template

Create a dated report file, for example:

- `docs/nhost/runs/2026-04-24-backup-restore-drill.md`

Use this structure:

| Field | Value |
|---|---|
| Drill date (UTC) |  |
| Drill owner |  |
| Platform operator |  |
| App verifier |  |
| Staging SHA |  |
| DB backup ID |  |
| Storage export ID |  |
| Restore start |  |
| Restore end |  |
| Observed RTO |  |
| Observed RPO |  |
| Target RTO/RPO met |  |
| Issues found |  |
| Final result (`PASS` / `FAIL`) |  |

## Checklist integration

After successful drill, update `docs/nhost/production-launch-checklist.md`:

- 10) Backup and restore:
  - `Restore drill is validated in non-production environment`
  - `RTO/RPO targets are documented and accepted`

