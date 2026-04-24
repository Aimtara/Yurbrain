# Nhost Observability Guide

This guide defines minimal, production-safe observability for Yurbrain's Nhost integration.

## Goals

- Make Nhost failures diagnosable with correlation-friendly logs.
- Keep end-user auth/error messages safe and actionable.
- Never leak secrets in logs or error payloads.

## Logging and error handling baseline

### API-safe error envelopes

- API error responses should be emitted through `sendSafeErrorResponse` so clients receive:
  - top-level `message`
  - `requestId`
  - nested `error` object with `code`, `statusCode`, and `correlationId`
- Validation, auth-required, and route-level function errors use the same envelope pattern.
- Route handlers must avoid returning raw thrown provider errors directly.

Files:

- `apps/api/src/middleware/observability.ts`
- `apps/api/src/server.ts`
- `apps/api/src/middleware/current-user.ts`
- `apps/api/src/routes/functions.ts`

### Client auth flows (web/mobile)

- Auth hooks normalize user-facing messages through `toUserSafeNhostAuthMessage` from `@yurbrain/nhost`.
- Raw provider error strings are not surfaced directly when they may be technical/noisy.
- Returned messages are short and user-safe (for example: invalid credentials, network issue, temporary failure).

Files:

- `apps/web/src/nhost/useNhostAuth.ts`
- `apps/mobile/src/nhost/useNhostAuth.ts`
- `packages/nhost/src/errors.ts`

### API-side Nhost GraphQL observability

- `queryNhostAdminGraphql` emits structured logs for:
  - request started
  - request succeeded
  - request failed (with optional retry)
- Logs include only safe metadata:
  - `event`, `operationName`, `attempt`, `totalAttempts`, `durationMs`, `correlationId`
  - classified error context (`nhostErrorCode`, `statusCode`, `retryable`, `operation`)
- Logs intentionally do **not** include:
  - tokens
  - admin secrets
  - passwords
  - raw auth headers
  - GraphQL query variables that may carry sensitive values

Files:

- `apps/api/src/services/nhost/graphql.ts`
- `packages/nhost/src/client.ts`
- `packages/nhost/src/errors.ts`

### Structured error helpers

Use `NhostRequestError` and helpers in `packages/nhost/src/errors.ts`:

- `createNhostRequestError(...)`: build typed errors with:
  - `code`
  - optional `statusCode`
  - `retryable`
  - `userMessage`
  - optional `operation`
- `toNhostRequestError(...)`: normalize unknown errors into `NhostRequestError`.
- `toNhostErrorLogContext(...)`: build safe log metadata from errors.
- `toUserSafeNhostAuthMessage(...)`: map provider/internal errors to user-safe auth text.

Behavior note:

- `toNhostRequestError(...)` intentionally uses the provided fallback message rather than forwarding unknown upstream raw messages.
- This keeps internal/provider detail in server logs only and avoids surfacing internals to UI clients.

## Safe GraphQL error handling

`executeServerGraphqlWithAdminSecret` classifies failures into explicit codes:

- `NHOST_CONFIG_ERROR`
- `NHOST_NETWORK_ERROR`
- `NHOST_HTTP_ERROR`
- `NHOST_GRAPHQL_ERROR`

Behavior:

- Missing config errors are explicit and non-retryable.
- Network failures are classified as retryable.
- HTTP failures carry status codes for observability without exposing headers.
- GraphQL errors are normalized and returned with safe user messages.

### Client-side GraphQL/API sanitization

- Shared REST API client throws `ApiClientError` containing:
  - `statusCode`
  - safe `message`
  - `code`
  - optional `requestId` and `correlationId` for support/debug flows
- Shared Hasura GraphQL client throws `HasuraGraphqlClientError` with safe messages and stable error codes.
- Raw Hasura GraphQL error text (for example permission traces) is intentionally not surfaced to end users.

Files:

- `packages/client/src/api/client.ts`
- `packages/client/src/graphql/hasura-client.ts`
- `apps/web/src/features/founder-review/useFounderReviewController.ts`

## Retry/backoff guidance

`queryNhostAdminGraphql` supports bounded retries for retryable failures.

Defaults:

- `maxRetries: 1` (2 total attempts)
- `initialBackoffMs: 250`
- exponential backoff: `initialBackoffMs * 2^(attempt-1)`

Guidance:

- Keep retries low (1-2) to avoid request amplification.
- Retry only when `retryable === true`.
- Pass `correlationId` for distributed tracing alignment.
- Prefer deterministic, idempotent operations for retryable paths.

## User-safe messaging rules

When reporting Nhost-related failures to users:

1. Prefer explicit but non-sensitive messages:
   - "Invalid email or password."
   - "Network issue. Check your connection and try again."
   - "Unable to complete this request right now."
2. Never echo raw backend headers or secrets.
3. Avoid exposing internal configuration names unless needed for operators (not end users).

## Hard constraints (must hold)

- Do not log:
  - access tokens
  - refresh tokens
  - admin secrets
  - passwords
  - raw authorization headers
- Do not include admin credentials in client runtime errors or UI strings.
- Do not log URL query strings for request completion logs (avoid accidental token leakage from query params).
- Do not log full private capture content (`rawContent`, full message bodies, attachment payloads).
