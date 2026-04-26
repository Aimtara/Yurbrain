# Yurbrain threat model

_Status: alpha hardening baseline._

## Protected assets

- User memories: BrainItems, raw content, notes, sources, artifacts, comments, AI replies, and Explore connection artifacts.
- Downstream actions: tasks, sessions, feed card states, preference choices, and founder diagnostics.
- Identity/session material: JWTs, Nhost session tokens, admin secrets, API keys, cookies, and reset/verification links.
- Operational data: logs, traces, incident evidence, deployment artifacts, backups, and support communications.
- Storage objects: capture attachments, imports, avatars, and attachment metadata.

## Trust boundaries

| Boundary | Risk | Required control | Current status |
| --- | --- | --- | --- |
| Browser/mobile client to API | Caller spoofs `userId` via header/query/body/path | Verified bearer identity in strict/staging/production; legacy header fallback only in explicit local/test legacy mode | P0 strict-header bypass under remediation |
| API to repository | Route forgets owner filter/check | `requireCurrentUser`, owner lookup before read/write, cross-user denial tests | Mostly implemented; matrix/test sweep incomplete |
| Public routes to raw events | Raw behavioral data exposure | `/events` blocked until scoped read model exists | Green for block; no scoped replacement yet |
| API to Nhost/JWKS | Misconfigured issuer/audience/JWKS accepts bad tokens | Production RS* JWKS validation, issuer and optional audience checks, safe failure | Automated scaffolding exists; staging proof pending |
| API/web/mobile logs | Token/secret/content leakage | Redacted logger fields and safe error responses | Baseline exists; needs expanded evidence |
| Storage object layer | Cross-user object read/delete or public buckets | Private buckets, user-prefixed object keys, owner-scoped metadata, signed URLs | Metadata exists; object lifecycle unproven |
| AI provider | Prompt/content leakage, hallucination, silent mutation | Bounded fallback, source grounding, timeout, observability, optional AI | Deterministic fallback exists; real provider rollout deferred |
| Operations/deploy | Bad deploy, migration failure, restore failure | staging-first gates, rollback runbook, backup/restore drill | Docs being formalized; drills pending |

## Primary threats and mitigations

### Identity spoofing

Threat: a caller supplies another user's ID in `x-yurbrain-user-id`, query params, path params, or request body.

Mitigations:
- Strict mode must derive identity only from verified bearer JWT.
- Header fallback is allowed only for explicit local/test legacy compatibility.
- Production/staging must reject missing, invalid, expired, wrong issuer, or wrong audience bearer tokens.
- Legacy path params such as `/preferences/:userId` must ignore the path owner and use `currentUser.id`.

### Cross-user data access

Threat: route handlers fetch user-owned resources without checking owner.

Mitigations:
- Every route must use `requireCurrentUser`.
- Read/update routes must load the resource and return 404/403 on owner mismatch.
- List routes must filter by `currentUser.id`.
- Authz smoke tests must cover all user-owned resource classes.

### Raw event exposure

Threat: raw event streams reveal sensitive behavior or cross-user data.

Mitigations:
- Keep `GET /events` disabled (`403`) until a scoped, schema-limited read model exists.
- Prefer derived summaries such as Founder Review.
- Event payloads must remain allowlisted and minimized.

### Storage leakage

Threat: object keys or metadata allow another user to list/read/delete files.

Mitigations:
- Private buckets by default.
- Object keys must be under `user/{user_id}/...`.
- Attachment metadata must use `attachments.user_id = currentUser.id`.
- Signed URLs must expire.
- Storage remains production-deferred until upload/read/list/delete isolation evidence exists.

### AI leakage or unsafe automation

Threat: AI sends too much context to a provider, fabricates unsupported output, or mutates user data silently.

Mitigations:
- AI is optional and dismissible.
- AI outputs must be grounded in source items/messages.
- Provider timeouts/failures must fall back deterministically.
- AI routes must be rate-limited and observable.
- No silent mutation of user data from AI output.

### Operational failure

Threat: release, migration, or incident response fails due to untested procedures.

Mitigations:
- Staging-first deployment and migration rehearsals.
- Rollback and backup/restore drills.
- SLOs and alerts before rollout.
- Controlled production waves with pause/rollback criteria.

## Open security blockers

1. P0: explicit strict identity mode must reject header fallback.
2. P1: full route-by-route authz matrix and denial tests are incomplete.
3. P1: rate limits are not yet implemented across route classes.
4. P2: attachment object lifecycle is not production-proven.
5. P4: staging JWT/CORS/storage/dashboard evidence is pending.

