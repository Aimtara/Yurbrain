# Production Gate

_Created: April 26, 2026._

Production remains **NO-GO** until this gate is fully evidenced after a signed staging packet.

## Preconditions

- [ ] `docs/readiness/STAGING_GATE.md` signed green.
- [ ] Release candidate commit is immutable and has a clean CI gate.
- [ ] No unreviewed production-impacting code changes after staging signoff.
- [ ] Product guardrail review confirms Focus/continuity UX is preserved.

## Environment audit

- [ ] `NODE_ENV=production`.
- [ ] Production deployment environment is set to `production`.
- [ ] API allowed origins are explicit; no wildcard credentialed CORS.
- [ ] JWT issuer, audience, and JWKS URL match production Nhost/auth configuration.
- [ ] Test header fallback is disabled.
- [ ] Admin secrets are server-only.
- [ ] Web/mobile public env vars contain only public-safe keys.
- [ ] AI provider flag/timeout/fallback settings are reviewed.
- [ ] Storage bucket settings match lifecycle policy if storage is in scope.

## Data protection

- [ ] Backup snapshot captured before deployment/migration.
- [ ] Migration dry-run or staging-first migration proof is linked.
- [ ] Rollback plan is ready and assigned.
- [ ] Restore escalation path is known.
- [ ] Retention/deletion limitations are documented in known issues.

## Deployment approval

- [ ] Engineering lead approval.
- [ ] Security approval.
- [ ] Product/vision approval.
- [ ] Support/on-call approval.
- [ ] Launch wave selected: founder-only / trusted alpha / broader alpha.

## Post-deploy smoke

- [ ] Health/readiness checks pass.
- [ ] Web app loads.
- [ ] Login/session validation passes.
- [ ] Capture creates a BrainItem.
- [ ] Focus Feed shows the capture/card.
- [ ] Brain Item Detail opens.
- [ ] Comment creation works.
- [ ] AI summary/query returns grounded output or safe fallback.
- [ ] Task conversion works.
- [ ] Session start/pause/finish works.
- [ ] Explore save works if enabled.
- [ ] Storage lifecycle works if enabled.
- [ ] Logout/session expiry behavior passes.
- [ ] Invalid/no-token strict auth returns 401.
- [ ] User B cannot read User A resources.

## Monitoring watch window

Minimum watch: 60 minutes for founder-only, longer for broader waves.

Track:

- API availability.
- Web availability.
- p95 latency by route class.
- 5xx rate.
- Auth failures/anomalies.
- Rate-limit events.
- AI fallback/timeouts.
- Storage errors.
- DB errors.
- Support tickets/user reports.
- Product signal: capture -> feed return -> continue/comment.

## Rollback triggers

Rollback or pause rollout if any occur:

- Critical auth bypass.
- Cross-user data exposure.
- Unrecoverable data write/corruption.
- Sustained 5xx or availability breach.
- Auth login/session failure for launch cohort.
- Storage lifecycle data loss if storage is in scope.
- AI behavior exposes unsupported sensitive output or silently mutates data.
- Product vision drift: app becomes dashboard/kanban/chatbot-first.

## Current status

**NO-GO.** Production cannot be approved until P0/P1 security evidence, storage/data decision, staging signoff, and operational drills are complete.
