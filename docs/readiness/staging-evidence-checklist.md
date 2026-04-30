# Staging evidence checklist

Last updated: 2026-04-30

Production readiness requires a saved evidence packet from an immutable release candidate SHA. Local test output is useful, but it is not a substitute for deployed staging proof.

## Release candidate

Record:

- Release candidate SHA:
- Branch:
- API staging URL:
- Web staging URL:
- Date/time started:
- Operator:
- Known feature scope decisions:
  - Web: in scope
  - Mobile: preview/deferred unless separate mobile smoke packet attached
  - Storage/attachments: deferred unless separate object lifecycle packet attached

## Automated checks

Run from a clean checkout with secrets supplied through environment variables only:

```bash
YURBRAIN_API_URL=https://api-staging.example.com \
YURBRAIN_TOKEN_A=... \
YURBRAIN_BAD_CORS_ORIGIN=https://evil.example \
pnpm smoke:staging
```

Expected coverage:

- `GET /health/live` returns 200.
- `GET /health/ready` returns 200.
- `GET /auth/me` with no token returns 401.
- `GET /auth/me` with invalid token returns 401.
- `GET /auth/me` with `YURBRAIN_TOKEN_A` returns 200 and a current-user id.
- Bad CORS origin returns 403 when `YURBRAIN_BAD_CORS_ORIGIN` is set.

Then run two-user isolation:

```bash
YURBRAIN_API_URL=https://api-staging.example.com \
YURBRAIN_TOKEN_A=... \
YURBRAIN_TOKEN_B=... \
pnpm smoke:two-user-isolation
```

Expected coverage:

- User A can capture an item.
- User A can read the item.
- User B gets 404 for User A's item.
- User B's feed does not expose User A's item.

Save terminal output with timestamps.

## Manual web core-loop smoke

Use the deployed web staging URL.

| Step | Expected result | Evidence |
| --- | --- | --- |
| Sign in as User A | Auth succeeds; current user is not ambiguous. | Screenshot/log |
| Capture | Capture sheet saves a note/link without requiring planning. | Screenshot |
| Focus Feed | New or seeded item appears in continuity feed. | Screenshot |
| Item detail | Item opens and preserves title/content/context. | Screenshot |
| Comment/update | User can add a continuation note. | Screenshot |
| AI summary/query | Summary or chat response returns grounded output or explicit fallback notice. | Screenshot/log |
| Plan This | Contextual planning creates/suggests a task from an item/comment. | Screenshot |
| Task/session | Start, pause/finish session path works. | Screenshot |
| Revisit later | Postpone/reschedule copy appears only around return flow. | Screenshot |
| Sign out/session expiry | User can sign out; expired/invalid session fails closed. | Screenshot |

## Manual two-user web check

1. Sign in as User A.
2. Capture a distinct item.
3. Sign out.
4. Sign in as User B.
5. Search/feed/item detail must not reveal User A's item.
6. Record result.

## Alert test evidence

- Alert name:
- Trigger method:
- Notification destination:
- Who received it:
- Acknowledgement time:
- Screenshot/log:

## Rollback rehearsal evidence

- Release candidate deployed:
- Bad deploy simulated:
- Rollback command/action:
- Smoke checks after rollback:
- Elapsed rollback time:
- Owner/signoff:

## Backup/restore drill evidence

- Known staging data created:
- Backup/snapshot ID:
- Restore target:
- Verification result:
- RTO:
- RPO:
- Owner/signoff:

## Production release candidate packet

Attach:

- CI green link/log for exact SHA.
- Automated staging smoke logs.
- Two-user isolation logs.
- Web core-loop screenshots/video.
- Alert test record.
- Rollback rehearsal record.
- Backup/restore drill record.
- Mobile/storage scope signoff.
- Support/on-call owner.
- Founder/operator final approval.
