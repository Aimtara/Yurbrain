# Yurbrain Incident Response Runbook

_Status: draft baseline; must be exercised before production._

## Severity levels

| Severity | Definition | Examples | Initial response |
| --- | --- | --- | --- |
| SEV1 | Critical security/data-loss/user-wide outage | cross-user data exposure, production DB corruption, auth accepts invalid tokens | page incident lead immediately; pause rollout; prepare rollback |
| SEV2 | Major user-impacting degradation | API 5xx spike, login outage, storage outage if enabled | assign incident lead within 15 minutes; update status every 30 minutes |
| SEV3 | Limited degradation or broken non-critical surface | Explore disabled, AI fallback spike with safe fallback | triage during business hours; publish known issue if user-visible |
| SEV4 | Cosmetic/docs/minor operational issue | typo, non-blocking checklist gap | track in backlog |

## First 15 minutes

1. Declare incident and severity.
2. Assign incident lead, comms owner, and technical investigator.
3. Freeze unrelated deploys.
4. Capture start time, affected environment, affected surfaces, and latest deploy SHA.
5. Check dashboards/logs for:
   - API 5xx and latency,
   - auth failures,
   - DB errors,
   - AI fallback/timeouts,
   - storage errors,
   - rate-limit spikes.
6. Decide whether to pause rollout or rollback.

## Security/data exposure path

If cross-user access, token bypass, raw event exposure, or storage leakage is suspected:

1. Treat as SEV1 until disproven.
2. Disable the affected route/feature flag if available.
3. Preserve logs and evidence.
4. Rotate exposed secrets if any are implicated.
5. Identify affected users/data classes.
6. Prepare user-impact assessment and legal/privacy review before external claims.

## Communications

- Internal update cadence: every 30 minutes for SEV1/SEV2.
- User communication must be factual and avoid unsupported root-cause claims.
- After resolution, publish a post-incident summary with:
  - timeline,
  - impact,
  - root cause,
  - remediation,
  - follow-up owners.

## Resolution criteria

- User impact has stopped.
- Rollback/fix is deployed and smoke-tested.
- Monitoring is stable for the watch window.
- Known issue/support guidance is updated.
- Follow-up actions are tracked.
