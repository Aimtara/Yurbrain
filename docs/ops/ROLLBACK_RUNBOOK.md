# Yurbrain Rollback Runbook

_Status: required before production launch; not yet rehearsed in staging._

## Rollback triggers

- Authentication failures spike after a deploy.
- Cross-user isolation defect is suspected.
- API 5xx rate or p95 latency exceeds alert thresholds.
- Storage object lifecycle fails or leaks access.
- Migration causes data loss, corruption, or startup failure.
- Product guardrail regression makes Focus/core continuity unusable.

## Pre-deploy rollback readiness

Before each staging or production deploy:

1. Record release candidate commit SHA.
2. Confirm previous stable artifact/commit SHA.
3. Confirm database backup/snapshot exists.
4. Confirm migrations are reversible or have a documented forward-fix plan.
5. Assign rollback DRI and comms DRI.
6. Keep monitoring dashboard open for watch window.

## Application rollback

1. Pause rollout wave or traffic promotion.
2. Redeploy previous stable artifact/commit.
3. Verify health/readiness.
4. Run post-rollback smoke:
   - `/auth/me` no-token returns 401 in strict mode,
   - web app loads,
   - capture/feed/detail/comment work for test user,
   - User B cannot read User A item,
   - storage smoke if storage is in scope.
5. Update incident log with timestamps and observed recovery.

## Database rollback

Database rollback is higher risk and must not be improvised.

1. Prefer forward fix if data is intact and schema is compatible.
2. If restore is required, follow `docs/ops/BACKUP_RESTORE_DRILL.md`.
3. Confirm RPO impact before restore.
4. Communicate user-impact window before broader alpha traffic resumes.

## Rehearsal requirement

Production is no-go until a staging rollback game-day records:

- bad deploy simulated,
- previous artifact restored,
- smoke tests passed,
- elapsed rollback time,
- owner and comms path validated.
