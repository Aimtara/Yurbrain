# Mobile Auth Manual QA Checklist

Use this checklist for MVP/Alpha mobile auth verification with Nhost.

## Preconditions

- `EXPO_PUBLIC_NHOST_*` mobile environment variables are configured.
- Nhost Auth is enabled for email/password.
- Redirect URLs are allowlisted in the Nhost dashboard for local/staging mobile deep links.

## Checklist

1. Open mobile app while signed out.
   - Expected: `Restoring Nhost session...` appears briefly, then the auth screen is shown.

2. Sign up with a new email/password.
   - Expected: success notice appears.
   - Expected: app shows instruction to verify email in inbox.

3. Sign in with valid credentials.
   - Expected: authenticated mobile surfaces load (feed/item/session/time/me tabs).
   - Expected: signed-in banner shows account email and sign-out action.

4. Verify session restore.
   - Relaunch app after sign-in.
   - Expected: restore/loading state appears, then authenticated state resumes without re-entering credentials.

5. Request password reset from auth screen.
   - Expected: reset request success notice appears.
   - Expected: Nhost password reset email is sent for known address.

6. Verify email-verification messaging.
   - With an unverified account, expected: verification banner appears with resend action.
   - Tap resend.
   - Expected: resend succeeds or a safe user-facing error is shown.

7. Sign out.
   - Tap sign-out from authenticated state.
   - Expected: app returns to auth screen and protected surfaces are hidden until next sign-in.

8. Auth error handling.
   - Attempt sign in with invalid credentials.
   - Expected: clear user-safe auth error is shown; app remains stable.
