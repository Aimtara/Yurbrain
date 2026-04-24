# Web Auth Manual QA Checklist

Use this checklist for MVP/Alpha web auth verification with Nhost.

## Preconditions

- `NEXT_PUBLIC_NHOST_*` web environment variables are configured.
- Web runtime points at the staging API (`YURBRAIN_API_ORIGIN` for Next.js rewrites, or `NEXT_PUBLIC_YURBRAIN_API_URL` when calling the API directly).
- Nhost Auth is enabled for email/password.
- Redirect URLs are allowlisted in Nhost dashboard.
- Use `docs/qa/staging-manual-qa.md` for staging setup before running this checklist.

## Checklist

1. Open web app while signed out.
   - Expected: auth screen is shown (not a dead-end "reload" message).

2. Sign up with a new email/password.
   - Expected: success notice appears and user can proceed to sign in.
   - Expected: verification email is sent by Nhost.

3. Sign in with valid credentials.
   - Expected: app loads authenticated surfaces (feed/session/etc).
   - Expected: signed-in banner shows user email and sign-out button.

4. Verify session restore.
   - Refresh browser tab after sign-in.
   - Expected: transient "Restoring session..." state then authenticated app state.

5. Request password reset from auth screen.
   - Expected: reset request success notice appears.
   - Expected: Nhost reset email is sent for known address.

6. Email verification messaging.
   - With unverified account, expected: verification banner appears with resend action.
   - Click resend.
   - Expected: verification resend success or safe error message.

7. Sign out.
   - Click sign out from authenticated app state.
   - Expected: user returns to auth screen.
   - Expected: subsequent protected API calls require a new auth session.

8. Auth error handling.
   - Attempt sign in with invalid password.
   - Expected: clear user-safe auth error displayed, app remains stable.
