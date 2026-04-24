# Alpha Smoke Test Plan

This runbook defines repeatable Alpha go/no-go checks across auth, capture, feed, detail, AI, search, mobile, and security.

## Scope and intent

- Goal: verify that Alpha-critical user journeys work end-to-end, with clear failure triage.
- Non-goal: build new product features inside QA; this plan tests current behavior.
- Environment baseline:
  - API running locally (`apps/api`) with seeded data where needed.
  - Web and mobile pointed to the same API/Nhost environment for manual checks.
  - Test users available:
    - User A (primary tester)
    - User B (isolation tester)

## How to run

### 1) Automated highest-value smoke checks

Run the consolidated command:

- `pnpm check:alpha-smoke`

What it covers:

- Strict auth core loop (capture → feed → detail → comments → plan/session → founder review)
- Capture intake variants and failure fallback behavior
- Feed action routes (`dismiss`, `snooze`, `refresh`)
- AI summarize/classify/query/convert + graceful fallback
- Search keyword/filter/isolation behavior
- JWT/auth invalid-token and strict-mode enforcement
- Cross-user spoof/identity enforcement checks
- Mobile cutover/provider/session wiring tests

### 2) Manual smoke checks

Manual checks are required for UI-driven flows and Nhost email/deep-link flows:

- Web auth UX + email flows
- Mobile sign-in/session restore/sign-out UX
- Detail page UX actions (view/edit/delete/comments in UI)
- Visual confirmation of feed/search states

Use these supporting checklists together with this plan:

- `docs/qa/web-auth-manual-checklist.md`
- `docs/qa/mobile-auth-manual-checklist.md`
- `docs/qa/capture-manual-checklist.md`

---

## Pass/Fail tracker

Use this table during execution. Mark each row `PASS`, `FAIL`, or `N/A` and attach evidence (command output, screenshot/video, or short notes).

| Area | Test | Mode | Status | Evidence/Notes |
|---|---|---|---|---|
| Auth | Sign up | Manual |  |  |
| Auth | Email verification | Manual |  |  |
| Auth | Sign in | Manual + Auto |  |  |
| Auth | Sign out | Manual |  |  |
| Auth | Password reset | Manual |  |  |
| Auth | Session restore | Manual + Auto |  |  |
| Capture | Create note | Manual + Auto |  |  |
| Capture | Create link | Manual + Auto |  |  |
| Capture | Create snippet/text capture | Manual + Auto |  |  |
| Capture | Failed capture state | Manual + Auto |  |  |
| Capture | Duplicate capture behavior (if supported) | Manual |  |  |
| Feed | New item appears | Manual + Auto |  |  |
| Feed | Dismiss | Manual + Auto |  |  |
| Feed | Snooze/remind-later (if supported) | Manual + Auto |  |  |
| Feed | Refresh | Manual + Auto |  |  |
| Detail | View item | Manual + Auto |  |  |
| Detail | Edit item | Manual + Auto |  |  |
| Detail | Delete item | Manual (N/A if unsupported) |  |  |
| Detail | Comments/messages (if supported) | Manual + Auto |  |  |
| AI | Summarize | Auto (+manual optional) |  |  |
| AI | Classify | Auto (+manual optional) |  |  |
| AI | Ask question | Auto (+manual optional) |  |  |
| AI | Convert to task | Auto (+manual optional) |  |  |
| AI | Graceful AI failure/fallback | Auto |  |  |
| Search | Keyword search | Manual + Auto |  |  |
| Search | Empty search | Manual + Auto |  |  |
| Search | No results | Manual + Auto |  |  |
| Search | Tag/type filters (if supported) | Manual + Auto |  |  |
| Mobile | Sign in | Manual |  |  |
| Mobile | Session restore | Manual + Auto |  |  |
| Mobile | Create capture | Manual |  |  |
| Mobile | View feed | Manual |  |  |
| Mobile | Sign out | Manual |  |  |
| Security | User A cannot see User B data | Manual + Auto |  |  |
| Security | Unauthenticated API request fails | Auto |  |  |
| Security | Invalid token fails | Auto |  |  |

---

## Section-by-section smoke plan

## 1) Auth

### Sign up (manual)

1. Open web auth screen while signed out.
2. Create a new account with unique email/password.
3. Confirm success message and next-step instructions.

Expected:

- Account creation succeeds with safe UX messaging.
- No raw provider/internal error appears in UI.

### Email verification (manual)

1. Confirm verification email is received.
2. Complete verification link flow.
3. Re-open app and verify account no longer shows unverified banner.

Expected:

- Verification flow completes; resend flow works with safe error text if needed.

### Sign in / Sign out / Session restore

- Manual:
  - Sign in with valid credentials.
  - Refresh/restart app to verify session restore.
  - Sign out and confirm protected surfaces are gated.
- Automated backing:
  - `src/__tests__/sprint12/strict-auth-core-loop.test.ts`
  - `src/__tests__/sprint15/current-user-jwt-validation.test.ts`
  - `src/__tests__/sprint14/strict-current-user-enforcement.test.ts`
  - `apps/mobile/src/__tests__/n12-mobile-cutover.test.ts`

### Password reset (manual)

1. Request password reset from auth screen.
2. Complete reset via email link.
3. Sign in with new password; old password should fail.

Expected:

- Reset email sent and reset completion works.
- Safe failure message if invalid/expired reset link.

---

## 2) Capture

### Create note / link / snippet

- Manual:
  - Create one note capture.
  - Create one link capture.
  - Create one text/snippet capture.
  - Confirm each appears in feed and detail.
- Automated backing:
  - `src/__tests__/sprint12/capture-intake.test.ts`
  - `src/__tests__/sprint12/strict-auth-core-loop.test.ts`

### Failed capture state

- Manual:
  - Simulate bad payload or temporary API unavailability.
  - Confirm explicit non-fake failure UI.
- Automated backing:
  - `capture enrichment failures do not block persistence`
  - `capture intake rejects empty payload with graceful validation error`
  - (in `src/__tests__/sprint12/capture-intake.test.ts`)

### Duplicate capture behavior (if supported)

- Manual only:
  - Submit same content twice.
  - Record expected behavior as either:
    - deduped item, or
    - separate items (acceptable for Alpha if documented).

---

## 3) Feed

### New item appears / dismiss / snooze / refresh

- Manual:
  - Verify new capture appears in feed.
  - Dismiss card.
  - Snooze/remind-later and verify hidden-until behavior.
  - Refresh card and verify state update.
- Automated backing:
  - `src/__tests__/sprint12/function-routes.test.ts` (feed actions and ownership)
  - `src/__tests__/sprint12/strict-auth-core-loop.test.ts` (capture-to-feed loop)

---

## 4) Detail

### View / edit / delete / comments-messages

- Manual:
  - Open detail for captured item.
  - Edit title/content; verify persistence.
  - Delete item if UI supports delete.
  - Add comment/message and verify thread updates.
- Automated backing:
  - View/edit: `src/__tests__/sprint2/brain-items.test.ts`
  - Comments/messages: `src/__tests__/sprint2/routes.test.ts`, `src/__tests__/sprint12/strict-auth-core-loop.test.ts`
  - Delete: manual only (or N/A if not currently supported in product)

---

## 5) AI

### Summarize / classify / ask question / convert / graceful failure

- Automated backing:
  - `src/__tests__/sprint3/ai-routes.test.ts`
  - `src/__tests__/sprint12/function-routes.test.ts`
- Manual spot-check (recommended):
  - Run summarize/classify/query/convert via UI on one item.
  - Trigger fallback scenario if practical and verify graceful output.

Expected:

- AI routes return valid output and do not crash the flow.
- Fallback path returns deterministic safe output when provider fails/timeouts.

---

## 6) Search

### Keyword / empty / no results / tag-type filters

- Manual:
  - Search by keyword and confirm expected item match.
  - Run empty search and confirm non-error default listing behavior.
  - Search known-missing keyword and confirm clean empty state.
  - Filter by tag/type and confirm scoped results.
- Automated backing:
  - `src/__tests__/sprint15/brain-items-search.test.ts`

---

## 7) Mobile

### Sign in / session restore / create capture / view feed / sign out

- Manual:
  - Execute full auth loop on device/emulator.
  - Create capture and verify feed visibility.
  - Relaunch app to verify session restore.
  - Sign out and verify protected UI is gated.
- Automated backing:
  - `apps/mobile/src/__tests__/n12-mobile-cutover.test.ts` (provider/session wiring baseline)

---

## 8) Security

### User isolation / unauthenticated rejection / invalid token rejection

- Manual:
  - With User A + User B, verify A cannot read B’s items/tasks/feed threads and vice versa.
- Automated backing:
  - Cross-user/isolation:
    - `src/__tests__/sprint15/brain-items-search.test.ts`
    - `src/__tests__/sprint14/strict-current-user-enforcement.test.ts`
    - `src/__tests__/sprint12/function-routes.test.ts` (owner-only feed actions)
  - Unauthenticated request rejection:
    - `src/__tests__/sprint14/strict-current-user-enforcement.test.ts`
  - Invalid/forged/expired token rejection:
    - `src/__tests__/sprint15/current-user-jwt-validation.test.ts`

---

## Known acceptable Alpha limitations

These are acceptable during Alpha if documented and understood:

- `pnpm test:e2e` currently exits non-zero because of known PGlite cleanup behavior even when assertions pass.
- Duplicate capture handling may be non-deduplicating (behavior must be consistent and documented).
- Some flows are validated primarily at API level; full UI automation is intentionally limited to avoid flaky browser/mobile CI.
- Email verification/reset rely on Nhost external mail/deep-link infrastructure and remain manual smoke checks.
- Semantic/vector search is deferred; keyword/filter search is the Alpha baseline.

---

## Go / No-Go criteria

## Go

Release is Alpha-ready only if all are true:

1. `pnpm check:alpha-smoke` passes fully.
2. All required manual Auth + Mobile checks pass.
3. Security isolation checks (A/B and invalid auth) pass.
4. No P0/P1 defects remain open in auth, capture, feed, detail, AI, search, or security.
5. Any accepted limitations are explicitly documented in release notes.

## No-Go

Block release if any of the following occur:

- Any automated alpha smoke suite fails in auth/security/core-loop/search/AI paths.
- Sign-in/session restore/sign-out fails on web or mobile.
- Cross-user data leakage is observed.
- Invalid/forged tokens are accepted.
- Capture succeeds with misleading fake-success behavior under failure conditions.

---

## Suggested execution order for QA operator

1. Run `pnpm check:alpha-smoke`.
2. Run web auth manual checklist.
3. Run mobile auth + capture/feed manual checks.
4. Execute A/B user isolation manual checks.
5. Fill pass/fail table and declare Go/No-Go.
