# Naming and Compatibility Decisions

_Created: 2026-04-26._

This log reconciles production-readiness assessment language with the current Yurbrain codebase. The default rule is to preserve working API/client contracts and current production architecture unless a security boundary requires stricter behavior.

## Summary policy

- Do not rename routes, enums, or persisted values purely for semantic consistency.
- Add canonical paths while keeping safe compatibility paths when clients may still use them.
- In strict/staging/production mode, server-derived identity always wins over caller-supplied owner fields.
- Mark legacy paths as compatibility-only before removal.
- Prefer docs and tests over disruptive data migrations unless there is clear production value.

## Decision table

| Name / concept | Current codebase convention | Assessment convention | Decision | Reason | Migration needed | Rollback risk | Tests added |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Task pending status | `todo` | sometimes `ready` | Keep `todo`. | Persisted enum, client UI, and tests already use `todo`; no production value in rename. | None before launch. Consider display-copy mapping only if UX asks. | High if renamed; would require DB/client migration. | Existing task/session tests. |
| Task complete status | `done` | sometimes `completed` | Keep `done`. | Existing enum/API contract is stable. | None. | Medium/high if renamed. | Existing task tests. |
| Session terminal state | `finished` | sometimes `completed` | Keep `finished`. | Current session lifecycle uses `running`/`paused`/`finished`; matches user-visible act loop. | None. | Medium if renamed. | Existing session lifecycle tests. |
| Focus home | `Focus Feed`, `activeSurface="feed"` | Focus Feed is home | Follow current code. | Current web shell already defaults to feed and preserves continuity-first home. | None. | Low. | Web smoke checklist pending. |
| Brain Item Detail | `ItemDetailSurface`, `ItemDetailScreen` | Brain Item Detail | Treat as same surface. | Code naming is implementation-level; product docs can use "Brain Item Detail". | Docs only. | Low. | Existing web build/typecheck; future web smoke. |
| Comments | `item_comment` thread messages and `POST /messages` | Comments first-class | Keep thread/message model. | Existing comments share message infrastructure with item chat. | None. | Medium if split. | Thread/message authz tests. |
| AI routes | `/ai/*` aliases plus `/functions/*` legacy functions | canonical `/ai/*` or `/feed/*`, legacy `/functions/*` | Keep both where present; document `/functions/*` as compatibility/serverless legacy. | Preserves clients while enabling newer item-scoped AI aliases. | Future client migration away from legacy paths if desired. | Medium if removed now. | AI alias and function route tests. |
| Feed functions | `/feed/*` and `/functions/feed/*` | canonical `/feed/*` | Keep `/feed/*` canonical; keep `/functions/feed/*` compatibility. | Current API supports both and tests compatibility denials. | Deprecation docs only. | Medium if removed. | Authz-route-denials covers both. |
| Preferences current user | `/preferences/me` | `/preferences/me` | Canonical. | Avoids path owner ambiguity. | Migrate docs/client guidance to `/preferences/me`. | Low. | Existing preference behavior; add explicit legacy test if needed. |
| Preferences legacy owner path | `/preferences/:userId` ignores path and uses current user | unsafe if path is authoritative | Keep as compatibility-only; never use path as authority; mark deprecated. | Production safety with client compatibility. | Add deprecation headers/docs; eventually remove after clients migrate. | Low with current owner-scoped behavior; high if path is trusted. | Existing strict auth; explicit test planned. |
| Caller `body.userId` fields | Optional in several schemas; routes use `currentUser.id` | Remove caller userId | Keep temporarily as compatibility-only but ignore in strict/prod. | Avoids breaking clients while closing auth boundary. | Future schema v2 can remove. | Low if ignored; medium if removed abruptly. | Strict spoof tests exist/planned expansion. |
| Caller `query.userId` fields | Optional in task/session query schemas; routes strip and replace with `currentUser.id` | Remove caller userId | Keep compatibility but ignore for authority. | Existing clients/tests may include it; server safety is enforced. | Future schema cleanup. | Low. | Authz-route-denials covers spoofed task/session query. |
| `x-yurbrain-user-id` | Local/test legacy header fallback only | unsafe caller identity | Keep only for non-strict test/local compatibility; strict/prod rejects. | Enables older local tests while production uses bearer tokens. | Client strict mode should be default for Nhost-authenticated surfaces. | Low in strict; high if enabled in prod. | Strict fallback denial and JWT tests. |
| Founder review | `/functions/founder-review` and `/diagnostics` | diagnostics/founder review | Keep founder-review naming; document as diagnostics-sensitive founder surface. | Product vocabulary exists; route has diagnostics rate class. | None. | Low. | Founder review tests and authz sweep. |
| Explore saved connection | `connection` artifact/feed card | connection artifact / Explore saved connection | Keep `connection` artifact type. | Persisted artifact enum; source-linked Explore semantics are clear. | None. | Medium if renamed. | Explore connection tests. |
| Rate limit feed class | `feed` | `feed_expensive` | Keep `feed` in code/docs. | Shorter current class name is implemented and sufficient. | Update stale docs, not code. | Low. | Rate limit tests. |
| Attachment/storage lifecycle | `attachments` metadata table; no object lifecycle API | storage production-ready or deferred | Defer for web-first production. | Metadata exists but object upload/read/list/delete is unproven. | Future full lifecycle implementation if storage enters scope. | High if claimed prematurely. | Metadata smoke only; object smoke pending/future. |
| Mobile launch surface | Expo app preview | multi-surface production | Web-first production; mobile preview/deferred. | No staging/mobile smoke evidence yet. | Create mobile launch-scope docs and future smoke checklist. | Low if deferred; high if launched without proof. | Mobile tests only; staging smoke pending/future. |

