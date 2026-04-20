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
- N3+: in progress / not started per `docs/backend-migration-status.md` and this runbook.

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
