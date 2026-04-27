# Strict Authentication Policy

_Status: production boundary policy._

## Summary

Strict mode is the only acceptable identity mode for staging and production. In strict mode, Yurbrain derives the current user from a verified bearer token and never from caller-supplied owner fields.

## When strict mode applies

Strict mode is active when any of the following is true:

- `YURBRAIN_IDENTITY_MODE=strict`,
- `NHOST_PROJECT_ENV=preview`,
- `NHOST_PROJECT_ENV=staging`,
- `NHOST_PROJECT_ENV=production`,
- a request sends `x-yurbrain-auth-mode: strict`,
- a request sends `x-yurbrain-identity-mode: strict`.

## Required behavior

| Case | Required result |
| --- | --- |
| No bearer token | `401 AUTHENTICATION_REQUIRED` |
| Invalid bearer token | `401 AUTHENTICATION_REQUIRED` |
| Expired bearer token | `401 AUTHENTICATION_REQUIRED` |
| Wrong issuer | `401 AUTHENTICATION_REQUIRED` |
| Wrong audience | `401 AUTHENTICATION_REQUIRED` |
| Missing/invalid Hasura user claims | `401 AUTHENTICATION_REQUIRED` |
| Spoofed `x-yurbrain-user-id` | Ignored; cannot authenticate request |
| Spoofed `query.userId` | Ignored for ownership |
| Spoofed `body.userId` | Ignored for ownership |
| Spoofed `/preferences/:userId` path | Ignored for ownership; legacy route scopes to current user |
| Valid bearer | `currentUser.id` is the token subject after claim validation |
| Cross-user resource read/write | `404` for hidden user-owned resources unless a route explicitly documents `403` |

## Token validation

Local tests use the deterministic test JWT helper under `YURBRAIN_TEST_MODE=1`.

Preview, staging, and production must use Nhost/JWKS validation:

- `NHOST_JWKS_URL` or `YURBRAIN_NHOST_JWKS_URL`,
- `NHOST_JWT_ISSUER` or `YURBRAIN_NHOST_JWT_ISSUER`,
- `NHOST_JWT_AUDIENCE` or `YURBRAIN_NHOST_JWT_AUDIENCE` when audience enforcement is configured.

Production algorithms are restricted to RS-family algorithms.

## Legacy header mode

`x-yurbrain-user-id` exists only for local/test compatibility. It is not a production authentication mechanism.

It may be used only when:

- the process is in test mode,
- the request is not strict,
- no Authorization header is present,
- `YURBRAIN_ALLOW_TEST_USER_HEADER` is not `0`.

If an Authorization header is present but invalid, the API must not fall back to `x-yurbrain-user-id`.

## Ownership rule

For protected routes, the server writes and reads user-owned rows using `currentUser.id`. Caller-supplied owner fields remain compatibility-only where they still exist in schemas:

- `CreateBrainItemRequest.userId`,
- `CaptureIntakeRequest.userId`,
- `ManualConvertTaskRequest.userId`,
- `CreateTaskRequest.userId`,
- `ListTasksQuery.userId`,
- `AiConvertRequest.userId`,
- `ListSessionsQuery.userId`,
- `/preferences/:userId`.

These are not authoritative in strict/staging/production.

## Current evidence

Local evidence at audit commit `8ae8d635e3fadf63fa0c78e98d1023b04446e622`:

- `pnpm check:authz-smoke` passes.
- `pnpm check:production-safety` passes.
- Strict identity tests cover no-token, invalid-token, spoofed header/body/query owner fields, valid bearer identity, and high-value two-user isolation.

Remaining evidence:

- real staging Nhost token smoke,
- wrong issuer/audience staging smoke,
- staging CORS rejection,
- full two-user staging isolation smoke.
