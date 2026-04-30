# Manual production tasks

Last updated: 2026-04-30

This document is for the founder/operator collecting evidence outside the codebase. Do not mark production ready until every launch-blocking manual task is complete and linked from the release candidate evidence packet.

## A. Required human decisions

Record each decision with owner, date, and signoff link.

- Is first production launch **web-only**?
- Is mobile production scope, preview, or deferred?
- Are storage/attachments production scope or deferred?
- Which LLM provider/model/budget is approved?
- What is the initial launch cohort size?
- Who owns support/on-call during launch?
- Who can approve expanding beyond founder-only or internal alpha?

## B. Required secrets and external setup

Required external values:

- Nhost staging URL.
- Nhost production URL.
- Nhost JWKS URL.
- JWT issuer.
- JWT audience, if enforced.
- OpenAI/Anthropic-compatible API key.
- Deployment platform secrets for API and web.
- Alert destination, such as email, Slack, PagerDuty, or equivalent.
- Domain/DNS configuration.

Rules:

- Never commit secrets to git.
- Use deployment provider secret settings for deployed environments.
- Use local `.env` files only if they are gitignored.
- Never paste bearer tokens or provider keys into docs, tickets, screenshots, or chat transcripts.

## C. Staging smoke steps

1. Pick the exact release candidate SHA.
2. Deploy API and web to staging from that SHA.
3. Create User A and User B in staging.
4. Generate tokens for User A and User B without saving them in git.
5. Run health checks:
   - `YURBRAIN_API_URL=https://api-staging.example.com node tooling/scripts/staging-smoke.mjs`
6. Run strict auth checks:
   - no-token `/auth/me` should fail closed.
   - invalid-token `/auth/me` should fail closed.
   - valid User A token `/auth/me` should return User A.
7. Run CORS rejection check:
   - set `YURBRAIN_BAD_CORS_ORIGIN=https://blocked-origin.example`.
8. Run two-user isolation:
   - `YURBRAIN_API_URL=... YURBRAIN_TOKEN_A=... YURBRAIN_TOKEN_B=... node tooling/scripts/two-user-isolation-smoke.mjs`
9. Run the web core-loop smoke from `staging-evidence-checklist.md`.
10. Save evidence: command output, screenshots/video, release SHA, date, operator, and any known issues.

## D. Alert test

1. Pick one staging alert that represents a real production concern.
2. Trigger it safely in staging.
3. Confirm notification arrives at the configured destination.
4. Record acknowledgement time and owner.
5. Attach the evidence to the release packet.

## E. Rollback rehearsal

1. Deploy the release candidate to staging.
2. Simulate a bad deploy by deploying a known-bad harmless version or toggling a reversible staging-only config.
3. Roll back to the release candidate or prior stable SHA.
4. Run staging smoke checks again.
5. Record elapsed time, operator, command/log evidence, and issues.

## F. Backup/restore drill

1. Create known staging data: one capture, one comment, one task/session, and any supported storage object if storage is in scope.
2. Take a backup/snapshot using the managed provider process.
3. Restore to the approved target.
4. Verify the known data survived and cross-user isolation still holds.
5. Record RTO, RPO, owner, date, and evidence.

## G. Production gate

1. Attach all staging evidence to the release packet.
2. Confirm CI is green on the exact release candidate SHA.
3. Confirm storage/mobile scope decisions are signed.
4. Assign support/on-call owner.
5. Take production backup/snapshot before deploy.
6. Approve founder-only or explicitly bounded rollout.
7. Run a 60-minute watch window after deploy.
8. Expand only after stable result and explicit approval.

## Current manual status

Production remains **NO-GO** until this document is completed with real evidence. Alpha may proceed only if the founder accepts web-first scope, storage/mobile deferrals, and staging smoke evidence status.
