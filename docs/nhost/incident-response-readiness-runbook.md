# Incident Response Readiness Runbook

Use this runbook to validate monitoring + incident response readiness before production launch.
Pair it with `docs/nhost/production-launch-checklist.md` sections 18-20.

## Scope

This runbook validates:

- alerts and dashboards are actionable
- on-call coverage and escalation paths are confirmed
- response communication templates are ready
- high-risk failure modes have tested runbooks

## Roles

- Incident commander
- API/application operator
- Nhost/infra operator
- Communications lead
- Scribe

## Inputs required

- Release SHA/tag
- On-call schedule for launch window
- Alerting destinations (for example PagerDuty/Slack/email)
- Links to dashboards/log views
- Incident communication channel name

## Severity matrix (starter)

| Severity | Definition | Example triggers | Initial response target |
|---|---|---|---|
| SEV-1 | Active data exposure or full outage | cross-user leak, auth completely down | immediate page + bridge now |
| SEV-2 | Major user-impacting degradation | high 5xx rate, login failures for many users | page on-call + triage channel |
| SEV-3 | Limited blast radius | isolated endpoint errors, partial feature break | ticket + monitored response |

## Escalation path template

1. Incident commander pages on-call engineer.
2. If unresolved in first response window, escalate to backup on-call.
3. Engage product/release owner for user-impact decisions.
4. Engage security owner immediately for any possible data exposure.

Document your real escalation contacts in the execution report.

## Readiness validation steps

### 1) Alert channel verification

1. Trigger a low-risk synthetic alert.
2. Verify on-call receives alert in the expected channel.
3. Verify alert message includes enough context to start triage.

Evidence to collect:

- alert screenshot or event ID
- recipient acknowledgment timestamp

### 2) Dashboard/log traceability check

1. Execute one known request through API.
2. Capture request/correlation ID from response/logs.
3. Confirm the same ID can be found end-to-end in logging system.

Evidence to collect:

- response headers/output with correlation ID
- log query screenshot/output showing same ID

### 3) Tabletop: auth outage

1. Simulate auth outage scenario in tabletop format.
2. Walk through owner assignment, user comms, mitigation, and rollback decision.
3. Confirm runbook link exists and is usable.

Evidence to collect:

- short notes with participants + decisions
- referenced runbook links

### 4) Tabletop: permission leak

1. Simulate suspected cross-user data leak.
2. Verify immediate containment actions are known:
   - halt rollout
   - revoke/rotate secrets if relevant
   - preserve forensic logs
3. Verify escalation to security owner is explicit.

Evidence to collect:

- containment checklist completion notes
- security escalation timestamp

### 5) Communication templates check

Prepare and validate templates for:

- initial incident acknowledgement
- periodic status update
- incident resolved summary

Evidence to collect:

- links/text of approved templates

## Required runbook inventory

Verify these runbooks exist and are current:

- Auth outage response
- Permission leak response
- Storage failure response
- Migration failure response
- Rollback execution (`docs/nhost/launch-day-command-clickbook.md`)

## Exit criteria

Mark incident response readiness as complete only when:

1. Severity matrix is approved by incident owner.
2. Escalation path is documented with named coverage.
3. Alert path test succeeded.
4. Correlation-ID traceability test succeeded.
5. Two tabletop drills (auth outage + permission leak) are completed.
6. Communication templates are approved and accessible.

## Report template

Use this structure in your release report:

| Field | Value |
|---|---|
| Run date (UTC) |  |
| Release SHA/tag |  |
| Incident commander |  |
| On-call primary |  |
| On-call backup |  |
| Alert channel verification result | PASS / FAIL |
| Correlation traceability result | PASS / FAIL |
| Auth outage tabletop result | PASS / FAIL |
| Permission leak tabletop result | PASS / FAIL |
| Templates prepared | YES / NO |
| Final readiness decision | READY / NOT READY |
| Evidence links |  |
