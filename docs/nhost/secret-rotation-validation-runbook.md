# Nhost Secret Rotation Validation Runbook

Use this runbook to validate `NHOST_ADMIN_SECRET` and related server-secret rotation end-to-end.

This runbook is required evidence for:

- `docs/nhost/production-launch-checklist.md` section `11) Secret rotation`

## Scope

Validate rotation for:

1. `NHOST_ADMIN_SECRET`
2. Any API-side privileged integration secrets used in production

Do not rotate client public anon keys as part of this runbook unless explicitly planned.

## Roles

- Rotation operator
- Verifier
- Incident commander (only engaged if rotation causes outage)

## Preconditions

1. Staging environment is healthy and mirrors production secret-injection topology.
2. Current release commit passes:
   - `pnpm check:production-safety`
3. Rollback owner and rollback command path are documented.

## Rotation rehearsal procedure (staging first)

1. Record baseline:
   - current deployment version
   - currently active secret version/identifier in secret manager
2. Generate new secret value in approved secret manager workflow.
3. Inject new secret version into API deployment target without removing old value until cutover is confirmed (if platform supports staged swap).
4. Redeploy/restart API so runtime picks up the new secret.
5. Run validation checks:
   - API health/readiness check succeeds.
   - Privileged server operation that depends on admin secret succeeds.
   - Standard authenticated user flows still succeed.
6. Invalidate/revoke old secret version after successful validation and overlap window.
7. Re-run validation checks to confirm no dependency on old secret remains.

## Emergency rollback procedure

Use this if rotation causes auth/platform failures:

1. Repoint deployment to last known-good secret version.
2. Redeploy/restart API.
3. Run minimal smoke:
   - sign in
   - capture create/read
   - search
4. Open incident report and document rotation failure root cause.

## Evidence template

Create a run record, for example:

- `docs/nhost/runs/2026-04-24-secret-rotation-validation.md`

| Field | Value |
|---|---|
| Environment |  |
| Date (UTC) |  |
| Rotation operator |  |
| Verifier |  |
| Previous secret version ID |  |
| New secret version ID |  |
| Cutover timestamp |  |
| Old secret revoke timestamp |  |
| Rollback required (`yes/no`) |  |
| Evidence links/logs |  |
| Result (`pass/fail`) |  |

## Acceptance criteria

Mark secret rotation as complete only when all are true:

1. New secret is active in runtime.
2. Old secret is revoked.
3. Validation flows pass after revocation.
4. Evidence record is committed in docs and linked in the production checklist.
