# Nhost / Hasura Environment-Key Contract

This document is the canonical environment-key contract for N3 (Nhost foundation scaffolding).

## Scope

- Applies to Nhost bootstrap in `packages/client/src/auth/nhost.ts`.
- Applies to GraphQL transport config in `packages/client/src/graphql/hasura-client.ts`.
- Defines required/optional keys, precedence, and sample values.

## A. Nhost bootstrap keys (`bootstrapNhostSession`)

Nhost is considered **configured** when at least one of these URL keys is present (non-empty):

- `NEXT_PUBLIC_NHOST_AUTH_URL`
- `NEXT_PUBLIC_NHOST_GRAPHQL_URL`
- `NEXT_PUBLIC_NHOST_FUNCTIONS_URL`
- `EXPO_PUBLIC_NHOST_AUTH_URL`
- `EXPO_PUBLIC_NHOST_GRAPHQL_URL`
- `EXPO_PUBLIC_NHOST_FUNCTIONS_URL`

Subdomain mode is also supported via:

- `NEXT_PUBLIC_NHOST_SUBDOMAIN` or `EXPO_PUBLIC_NHOST_SUBDOMAIN`
- `NEXT_PUBLIC_NHOST_REGION` or `EXPO_PUBLIC_NHOST_REGION`

### Nhost key matrix

| Key group | Required? | Precedence | Sample value |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_NHOST_SUBDOMAIN`, `EXPO_PUBLIC_NHOST_SUBDOMAIN` | Conditionally required (required if URL keys are absent) | `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `abcxyz123` |
| `NEXT_PUBLIC_NHOST_REGION`, `EXPO_PUBLIC_NHOST_REGION` | Conditionally required with subdomain mode | `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `us-east-1` |
| `NEXT_PUBLIC_NHOST_AUTH_URL`, `EXPO_PUBLIC_NHOST_AUTH_URL` | Optional (any one URL key can activate config) | `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `https://abcxyz123.us-east-1.nhost.run/v1/auth` |
| `NEXT_PUBLIC_NHOST_GRAPHQL_URL`, `EXPO_PUBLIC_NHOST_GRAPHQL_URL` | Optional | `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `https://abcxyz123.us-east-1.nhost.run/v1/graphql` |
| `NEXT_PUBLIC_NHOST_FUNCTIONS_URL`, `EXPO_PUBLIC_NHOST_FUNCTIONS_URL` | Optional | `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `https://abcxyz123.us-east-1.nhost.run/v1/functions` |

## B. Hasura GraphQL keys (`isHasuraGraphqlConfigured` / `hasuraGraphqlRequest`)

### Hasura key matrix

| Key group | Required? | Precedence (highest -> lowest) | Sample value |
| --- | --- | --- | --- |
| `YURBRAIN_HASURA_GRAPHQL_URL`, `NEXT_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL`, `EXPO_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL` | **Required for GraphQL mode** | `configureHasuraGraphqlUrl(...)` runtime override -> `globalThis.__YURBRAIN_HASURA_GRAPHQL_URL` -> `YURBRAIN_HASURA_GRAPHQL_URL` -> `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `https://abcxyz123.us-east-1.nhost.run/v1/graphql` |
| `YURBRAIN_HASURA_ADMIN_SECRET`, `NEXT_PUBLIC_YURBRAIN_HASURA_ADMIN_SECRET`, `EXPO_PUBLIC_YURBRAIN_HASURA_ADMIN_SECRET` | Optional (server-only preferred) | `configureHasuraAdminSecret(...)` runtime override -> `globalThis.__YURBRAIN_HASURA_ADMIN_SECRET` -> `YURBRAIN_HASURA_ADMIN_SECRET` -> `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` | `nhost-admin-secret-value` |
| `YURBRAIN_HASURA_ROLE`, `NEXT_PUBLIC_YURBRAIN_HASURA_ROLE`, `EXPO_PUBLIC_YURBRAIN_HASURA_ROLE` | Optional | `configureHasuraRole(...)` runtime override -> `globalThis.__YURBRAIN_HASURA_ROLE` -> `YURBRAIN_HASURA_ROLE` -> `NEXT_PUBLIC_*` -> `EXPO_PUBLIC_*` -> default `user` | `user` |

## C. Minimal `.env` examples

Web (`apps/web/.env.local`):

```bash
NEXT_PUBLIC_NHOST_SUBDOMAIN=abcxyz123
NEXT_PUBLIC_NHOST_REGION=us-east-1
NEXT_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL=https://abcxyz123.us-east-1.nhost.run/v1/graphql
```

Mobile (`apps/mobile/.env`):

```bash
EXPO_PUBLIC_NHOST_SUBDOMAIN=abcxyz123
EXPO_PUBLIC_NHOST_REGION=us-east-1
EXPO_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL=https://abcxyz123.us-east-1.nhost.run/v1/graphql
```

API/server env (private):

```bash
YURBRAIN_HASURA_GRAPHQL_URL=https://abcxyz123.us-east-1.nhost.run/v1/graphql
YURBRAIN_HASURA_ADMIN_SECRET=<server-only-secret>
YURBRAIN_HASURA_ROLE=user
```

## D. Acceptance checks for N3

N3 env/config expectations are satisfied only when all are true:

1. This contract document is present and referenced by the runbook + cutover checklist.
2. Web and mobile env templates match these keys.
3. `bootstrapNhostSession()` returns `{ configured: true }` when valid keys are set.
4. `isHasuraGraphqlConfigured()` returns true with configured GraphQL URL.
