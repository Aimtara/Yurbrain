# Alpha Smoke Execution Report Template

Use this template to record the manual evidence required by `docs/qa/alpha-smoke-test.md`.

Create a release-specific copy before execution, for example:

- `docs/qa/runs/2026-04-24-alpha-smoke-report.md`

## Run metadata

| Field | Value |
|---|---|
| Release SHA/tag |  |
| Environment (`staging` / `production-candidate`) |  |
| Run date (UTC) |  |
| Primary operator |  |
| Secondary reviewer |  |
| User A test account |  |
| User B test account |  |

## Automated command evidence

| Command | Status | Notes/Evidence |
|---|---|---|
| `pnpm check:alpha-smoke` |  |  |

## Manual auth evidence

| Surface | Scenario | Status | Evidence |
|---|---|---|---|
| Web | Sign up |  |  |
| Web | Email verification |  |  |
| Web | Sign in |  |  |
| Web | Password reset |  |  |
| Web | Session restore |  |  |
| Web | Sign out |  |  |
| Mobile | Sign up |  |  |
| Mobile | Email verification |  |  |
| Mobile | Sign in |  |  |
| Mobile | Password reset |  |  |
| Mobile | Session restore |  |  |
| Mobile | Sign out |  |  |

## Manual product flow evidence

| Area | Scenario | Status | Evidence |
|---|---|---|---|
| Capture | Create note/link/snippet |  |  |
| Capture | Failed capture state is explicit and non-misleading |  |  |
| Feed | New item appears + dismiss + snooze + refresh |  |  |
| Detail | View/edit/comments behavior |  |  |
| Search | Keyword + empty + no results + filter behavior |  |  |

## A/B isolation evidence (required)

| Scenario | Status | Evidence |
|---|---|---|
| User A cannot read User B captures |  |  |
| User A cannot read User B feed/tasks/sessions |  |  |
| User B cannot read User A captures |  |  |
| User B cannot read User A feed/tasks/sessions |  |  |
| Forged/invalid token rejected with safe error envelope |  |  |

## Defects and waivers

| ID | Severity | Description | Owner | Resolution / waiver |
|---|---|---|---|---|
|  |  |  |  |  |

## Alpha go/no-go decision

- Decision: `GO` / `NO-GO`
- Decision owner:
- Timestamp (UTC):
- Notes:
