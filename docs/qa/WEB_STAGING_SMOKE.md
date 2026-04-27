# Web Staging Smoke

Status: **required before production**.

This smoke verifies the web-first launch surface against the continuity loop and strict staging auth boundary.

## Preconditions

- Staging API is deployed with:
  - `NODE_ENV=production`
  - `NHOST_PROJECT_ENV=staging`
  - `YURBRAIN_IDENTITY_MODE=strict`
  - explicit `API_ALLOWED_ORIGINS`
  - staging JWT issuer/JWKS/audience settings.
- Staging web is deployed with `NEXT_PUBLIC_YURBRAIN_API_URL` pointing to the staging API.
- Two staging users exist and can authenticate.
- Storage is either explicitly deferred or separately enabled with storage smoke evidence.

## Smoke steps

| Step | Expected result | Result | Evidence |
| --- | --- | --- | --- |
| Load web app | App loads without console/auth bootstrap errors | Pending | |
| Login | User session is established | Pending | |
| Confirm current user | `/auth/me` returns bearer-derived identity | Pending | |
| Capture note | Capture saves without required tags/projects/tasks | Pending | |
| Focus card appears | New card appears in Focus Feed | Pending | |
| Open Brain Item Detail | Original context and continuity prompts are visible | Pending | |
| Add comment | Comment appears in item timeline | Pending | |
| Ask Yurbrain | Grounded answer or safe fallback appears | Pending | |
| Plan This / convert | Optional task conversion works | Pending | |
| Start session | Session starts from downstream task | Pending | |
| Pause/finish session | Session state transitions work | Pending | |
| Explore preview/save if enabled | Source-linked connection is previewed/saved | Pending/deferred | |
| Logout | Session clears and no-token behavior is safe | Pending | |

## Product guardrail checks

- [ ] Focus Feed is home.
- [ ] Capture remains low-friction.
- [ ] Comments are first-class.
- [ ] AI is optional and dismissible.
- [ ] Tasks remain downstream.
- [ ] Explore remains optional and source-linked.
- [ ] No dashboard/kanban/inbox-zero/chatbot-primary drift is introduced.

## Evidence log

| Date | Operator | Release candidate commit | Result | Notes/screenshots |
| --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending |
