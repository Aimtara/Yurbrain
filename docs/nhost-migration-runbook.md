# Nhost Migration Runbook

This runbook defines the operational sequence for migrating Yurbrain from prototype REST APIs to Nhost Auth + Hasura GraphQL + Nhost Functions without breaking the validated continuity loop.

## Loop safety principle

At every checkpoint, these user-visible paths must remain usable:

1. Capture
2. Feed
3. Item Detail
4. Comments / continuation
5. Plan This
6. Session
7. Founder Review

No phase can be marked complete if any loop step degrades materially.

## Phase sequence

1. N1: audit and migration tracking.
2. N2: domain client stabilization in `packages/client`.
3. N3: Nhost foundation scaffolding.
4. N4: auth/current user cutover (web first).
5. N5: schema, permissions, and backfill scaffolding.
6. N6: GraphQL CRUD wrappers in client.
7. N7: web CRUD cutover.
8. N8: feed function cutover.
9. N9: AI thin-slice functions.
10. N10: founder review function + web integration.
11. N11: event safety pass.
12. N12: mobile cutover.
13. N13: legacy REST strangler cleanup.

## N2 implementation baseline (now in repo)

N2 is considered established when these are true:

1. `packages/client/src/createYurbrainClient.ts` exists and exposes a stable `YurbrainClient` interface.
2. `packages/client/src/yurbrainClient.ts` exports the singleton frontend-facing client.
3. Client supports REST-backed behavior and Nhost-backed bootstrap scaffold behind one interface.
4. Provider/hook scaffolding exists for UI usage:
   - `packages/client/src/provider.tsx`
   - web/mobile provider integration stubs.

N2 does not change backend behavior; it stabilizes the client boundary for later cutovers.

## Phase completion status

- N1 (audit and migration tracking): complete.
- N2 (domain client stabilization): complete.
- N3 (Nhost foundation scaffolding): complete.
- N4 (auth/current user cutover, web-first): complete.
- N5 (schema/permissions/backfill scaffolding): complete.
- N6 (GraphQL CRUD wrappers in client): complete.
- N7 (web CRUD cutover): complete.
- N8 (feed function cutover): complete.
- N9 (AI thin-slice functions): complete.
- N10+ (founder review hardening and beyond): in progress / not started per `docs/backend-migration-status.md`.

## N3 implementation baseline (now in repo)

N3 is considered established when these are true:

1. Nhost runtime config resolution is centralized in `packages/client/src/auth/nhost.ts`.
2. Config supports explicit auth/graphql/functions URLs and subdomain/region-derived defaults.
3. Bootstrap hydrates Hasura GraphQL endpoint config from Nhost runtime config.
4. Bootstrap remains non-invasive to product behavior (REST-backed domain paths unchanged).
5. Runtime-config and bootstrap behavior are covered by targeted tests.

## N3 environment/config contract (explicit)

N3 cannot be marked complete until `docs/nhost-env-contract.md` is satisfied and referenced by checklist evidence.

Contract source of truth:

- `docs/nhost-env-contract.md` (required/optional keys, precedence, sample values, and minimal env examples).
- Nhost initialization config for this migration includes `nhost/config.yaml`, with TOML (`nhost/nhost.toml` + overlays) documented as the modern CLI-forward path.

## N4 implementation baseline (current progress)

N4 is in progress when these are true:

1. Web provider initializes client with Nhost transport selected.
2. Nhost bootstrap enforces strict identity mode (no env/random user-id fallback) once Nhost transport is active.
3. Configured-but-no-session bootstrap path clears stale identity/token state.
4. Web handles unauthorized identity state gracefully for protected views (without embedding transport calls in UI).
5. Strict-mode requests require bearer-derived identity server-side (header/query/body userId fallbacks are ignored in strict mode).
6. Authenticated strict-mode smoke tests cover core loop operations (capture, feed, item detail, comments, plan, session, founder review).

## N5 implementation baseline (current scaffolding)

N5 is scaffolded when these are true:

1. Schema includes `profiles` table keyed by auth subject (`id`) with optional display fields and backfill metadata.
2. Existing owner-bearing tables keep explicit `user_id` columns to preserve parity during transition.
3. Repository layer supports profile reads/upserts and profile-backfill discovery.
4. Backfill script exists to populate missing profiles from known owner IDs without destructive rewrites.
5. Validation tests cover profile upsert + backfill-selection behavior.

## N6 implementation baseline (completed)

N6 is complete when these are true:

1. `packages/client` provides GraphQL CRUD wrappers for web-cutover target entities where parity is safe (`brain item list/detail/update`, threads/messages, tasks/sessions, preferences).
2. GraphQL wrappers remain owner-scoped and depend on authenticated identity (`x-hasura-user-id`) with no UI transport leakage.
3. Domain client selects GraphQL CRUD wrappers only when Hasura GraphQL is configured; otherwise REST parity path remains intact.
4. Session list GraphQL path uses owner-backed `sessions.user_id` scoping, aligned to N5 ownership scaffolding.
5. Loop-critical side-effectful create paths that are not parity-safe yet (notably `createBrainItem`) remain on REST/function path until N7 cutover evidence is complete.
6. CRUD wrapper behavior is covered by targeted client tests proving GraphQL routing and fallback parity.

## N7 implementation baseline (completed)

N7 is complete when these are true:

1. Web domain calls for parity-safe CRUD/list/detail flows resolve through N6 GraphQL wrappers behind `packages/client` boundary.
2. Session lifecycle in GraphQL mode no longer depends on legacy REST lifecycle routes; it uses function-helper-backed paths.
3. Side-effectful create flows that are not parity-safe (`createBrainItem`) remain on REST/function path by design.
4. Web controllers keep transport hidden behind `YurbrainClient` methods and include no direct GraphQL/function calls.
5. Validation evidence confirms loop safety checkpoints remained intact through the cutover.

## N8 implementation baseline (completed)

N8 is complete when these are true:

1. Feed retrieval and interaction paths are routed through function-backed APIs (`/functions/feed` + feed action helpers) via `packages/client`.
2. Canonical function routes and compatibility aliases are aligned (`/functions/feed` + `/functions/feed/rank`, `/functions/what-should-i-do-next` + `/functions/next-step`) with targeted tests.
3. Founder review and synthesis-computed pathways remain function-backed in the shared client boundary (no UI transport leakage).
4. Validation evidence covers strict-auth loop safety and function-feed ranking ergonomics.

## N9 implementation baseline (completed)

N9 is complete when these are true:

1. AI thin-slice pathways (`summarize/classify/query/convert`) are routed to function-backed APIs behind `packages/client`.
2. Function-route behavior is validated with strict-auth tests covering concise, grounded synthesis and deterministic fallback behavior.
3. Ownership failures for thin-slice function routes are graceful (`404`) and do not surface as internal server errors.
4. Loop parity checkpoints remain green after N9 cutover slices.

## N10 implementation baseline (kickoff)

N10 is in progress when these are true:

1. Founder review computed quality and diagnostics are hardened for production-readiness while preserving concise continuity output.
2. Temporary compatibility pathways retained from N8/N9 are reviewed and either removed or explicitly justified.
3. Web integration continues to show no UI transport leakage while founder-facing actions remain continuity-first.
## N5 required/optional backfill order

Required for N6/N7 cutover safety:

1. Add ownership scaffold columns and indexes (`item_artifacts.user_id`, `item_threads.user_id`, `thread_messages.user_id`, `sessions.user_id`).
2. Backfill `sessions.user_id` from task ownership (`sessions.task_id -> tasks.user_id`).
3. Backfill `item_threads.user_id` from target item ownership (`item_threads.target_item_id -> brain_items.user_id`).
4. Backfill `thread_messages.user_id` from thread ownership (`thread_messages.thread_id -> item_threads.user_id`).
5. Backfill `item_artifacts.user_id` from item ownership (`item_artifacts.item_id -> brain_items.user_id`).
6. Ensure `profiles` exists for all known owner IDs from `brain_items`, `feed_cards`, `tasks`, `events`, and `user_preferences`.

Optional / post-cutover cleanup:

1. Populate `profiles.email` and `profiles.display_name` from authoritative auth metadata once available.
2. Tighten `NOT NULL` ownership constraints only after parity evidence confirms all writes are owner-scoped.
3. Remove temporary compatibility pathways once GraphQL/Functions parity is complete.

## Demo/founder identity mapping strategy

- Local seeded founder UUID (`11111111-1111-1111-1111-111111111111`) maps one-to-one to `profiles.id`.
- On migrated Nhost paths, canonical identity source is auth subject (`x-hasura-user-id`); no demo/runtime fallback on strict web paths.
- If a seeded local profile lacks auth metadata, keep nullable display fields and track provenance via `backfill_source` / `backfilled_at`.

## Cutover rules

- No big-bang rewrite.
- No direct GraphQL or function calls from React screens.
- All screen data access via `packages/client` domain methods only.
- Web cutover before mobile cutover.
- REST route deletion only after parity is proven.

## Validation checkpoints per slice

After each migration slice:

1. Capture path works.
2. Feed loads with expected continuity quality.
3. Item detail shows continuity context.
4. Comment/continuation writes and reads work.
5. Plan This flow still produces actionable task/session behavior.
6. Session start/pause/finish path works.
7. Founder Review remains concise and actionable.

If any checkpoint fails, stop and fix before continuing phases.

## Backfill and ownership strategy

1. Ensure owner-scoped rows for target entities:
   - `profiles`
   - `brain_items`
   - `item_artifacts`
   - `threads`
   - `thread_messages`
   - `tasks`
   - `sessions`
   - `events`
2. Default user ownership from authenticated subject (`x-hasura-user-id`).
3. Keep artifact writes server-side where possible.
4. Keep raw events server-side or tightly restricted.

## Risk watchlist / stop conditions

Pause migration and resolve before continuing if any occur:

- feed ranking quality degrades.
- item detail continuity context disappears.
- comments or sessions become unreliable.
- demo-user fallback remains on migrated path.
- UI components start embedding transport logic.
- web/mobile behavior diverges.
- raw event leakage appears in client logic.
- route deletions proposed before parity evidence.

## Exit criteria for REST cleanup (N13)

Only remove a REST handler when all are true:

1. Domain client method is fully backed by GraphQL/Function target.
2. Web path using that method is parity validated.
3. Mobile path using that method is parity validated (or not yet released).
4. No active caller remains.
5. Migration tracker marks route as replaceable.
