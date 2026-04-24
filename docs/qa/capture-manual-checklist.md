# Capture Manual QA Checklist (MVP)

Use this checklist to validate MVP capture behavior end-to-end without placeholder confusion.

## Preconditions

- API is reachable either locally (`apps/api`) or via the deployed staging API URL, and web/mobile are connected to that same environment.
- For staging setup, use `docs/qa/staging-manual-qa.md`.
- Authenticated user session is active.
- Capture sheet can be opened from the app shell.

## MVP checks

1. Text capture
   - Open capture sheet and submit a plain text capture.
   - Expected: success state appears and new item shows in feed/items.

2. Link capture
   - Set mode to `Link`, submit a valid URL.
   - Expected: capture saves; item content type is link; feed updates.

3. Image/file reference metadata capture
   - Set mode to `Image ref`, submit an image URL or file reference text.
   - Expected: capture saves as image-reference metadata only (no fake upload progress/success).

4. Save + Plan
   - Submit capture via `Save + Plan`.
   - Expected: capture is saved first; planning flow/status is shown if conversion runs.

5. Failure handling
   - Simulate API unavailability or invalid auth and submit capture.
   - Expected: clear error message appears; no fake success state.

## Deferred/non-MVP checks

1. Voice/audio capture
   - Expected: not interactive for MVP; clearly labeled post-alpha.

2. Native file upload
   - Expected: no upload affordance pretending files were uploaded.

3. Reminder scheduling from capture submit
   - Expected: no fake “scheduled reminder” success in capture flow.
   - Note: feed card snooze/remind behavior is separate and may still exist.
