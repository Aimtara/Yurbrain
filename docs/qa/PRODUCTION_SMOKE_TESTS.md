# Production Smoke Tests

Status: required before any production launch wave.

## Web smoke

1. Load the web app.
2. Sign in and verify `/auth/me` returns the current bearer identity.
3. Capture a text note.
4. Confirm a Focus Feed card appears.
5. Open Brain Item Detail.
6. Add a comment.
7. Ask Yurbrain or request a summary; verify grounded output or safe fallback.
8. Plan/convert the item.
9. Create a task.
10. Start a session.
11. Pause or finish the session.
12. Preview Explore with source items.
13. Save a Connection Card if Explore is enabled.
14. Confirm the connection returns to Focus.
15. Sign out.
16. Verify no-token and invalid-token strict requests return `401`.

## Security smoke

1. User A creates an item.
2. User B cannot read or update User A's item.
3. User B cannot access User A's feed card.
4. User B cannot read User A's thread/messages.
5. User B cannot read/update/start User A's task/session.
6. User B cannot access User A's attachment if storage is enabled.
7. Header/query/body/path `userId` spoofing is ignored in strict mode.

## Storage smoke

Run only if attachments are in launch scope:

1. Upload object.
2. Read/download object.
3. List attachments by BrainItem.
4. Delete object.
5. Confirm deleted read fails.
6. Confirm cross-user read/delete is denied.

If attachments are deferred, record the deferral and verify no production UX promises full attachment support.

## Mobile smoke

Mobile is preview by default. If mobile enters launch scope, repeat login, capture, feed, detail, comment, plan, session, and logout smoke on a release build/device matrix.
