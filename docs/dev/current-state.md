# Yurbrain Development Current State

_Last audited: April 25, 2026._

This is the implementation-truth audit for the current repository. It is intentionally factual: it records what is present today, what remains mocked or deferred, and the safest next steps for continuing the Yurbrain core loop without turning the product into a dashboard, task manager, or separate Explore system.

## 1. What exists?

- **Monorepo foundation:** pnpm workspaces + Turborepo with `apps/api`, `apps/web`, `apps/mobile`, and shared packages for contracts, DB, UI, client, AI, and Nhost support.
- **API:** Fastify API in `apps/api` with route modules for BrainItems, capture, threads, messages, preferences, feed, tasks, sessions, and function/AI routes.
- **Persistence:** `packages/db` provides a PGlite + Drizzle repository and startup migrations.
- **Contracts:** `packages/contracts` provides Zod schemas for current BrainItem, Artifact, Thread, Message, FeedCard, Task, Session, Event, and UserPreference shapes.
- **Client:** `packages/client` provides endpoint wrappers, domain client methods, React hooks, and a higher-level Yurbrain client.
- **UI:** `packages/ui` provides shared components for capture, feed cards/lenses/comments, item detail/chat, planning, task/session screens, and Time/Me supporting surfaces.
- **Web app:** `apps/web/app/page.tsx` is the primary integrated full-loop surface. It supports Focus, Item Detail, Time, Me, capture, feed interactions, comments, ask, plan, sessions, preferences, and Nhost auth gating.
- **Mobile app:** `apps/mobile` has a lighter Focus/Time/Me/Item/Capture loop with tap-friendly interactions.
- **AI:** deterministic local AI runner/fallback behavior exists for summarize/classify/query, plus provider scaffolding for selected synthesis routes.
- **Testing:** API, contracts, client, DB, UI, AI, mobile, and end-to-end smoke tests exist.

## 2. What is mocked or placeholder?

- AI remains mostly deterministic/local-stub for the product-critical loop. Real provider scaffolding exists for selected synthesis functions, but capture/feed/comment/task/session flows do not require external model credentials.
- Explore is currently only a render-mode preference plus optional `FeedCard.explore` metadata. There is no Explore surface, connection preview route, or save-connection flow yet.
- Voice capture, file uploads from the capture sheet, and richer media feed cards are visible as post-alpha/stub affordances.
- `/events` is intentionally disabled for reads until authentication and per-user event filtering are implemented, though internal event rows exist.
- Some lint/build coverage remains uneven across packages; `apps/api` is the strongest TypeScript lint target.

## 3. What is persisted?

- BrainItems, ItemArtifacts, item threads, thread messages, FeedCards, tasks, sessions, events, profiles, attachments, and user preferences are persisted in PGlite.
- Feed dismiss/snooze/refresh/postpone metadata persists.
- AI summary/classification artifacts persist.
- Item chat replies and user comments persist as thread messages.
- Founder mode, render mode, AI summary mode, feed density, resurfacing intensity, and default lens persist in user preferences.

## 4. What is in-memory or browser-local?

- No critical API runtime path currently depends on route-level in-memory `Map` state.
- Web UI selection state is local/browser state: active surface, selected item/task, open sheets, search inputs, pending plan/postpone/finish sheets, and Explore state once added.
- The first Explore prototype should intentionally keep canvas/workspace state local and only persist saved Connection Cards as artifacts/feed cards.

## 5. What is missing?

- Required product/docs files:
  - `docs/product/EXPLORE_MODE_SPEC.md`
  - `docs/product/DO_NOT_BUILD_YET.md`
- Explore implementation:
  - `POST /explore/connections/preview`
  - `POST /explore/connections/save`
  - Connection contract/validator/fallback behavior
  - Web/mobile Explore entry points
  - Saved Connection Card in Focus Feed
- Contract/schema gaps:
  - `FeedCardType` lacks `connection`.
  - `ArtifactType` lacks `connection`.
  - Event taxonomy is much smaller than the product taxonomy.
  - Current task/session/thread/message naming differs from the frozen target model.
- API compatibility aliases:
  - Prompt-specified `/ai/*` routes are not present; current AI routes are `/functions/*`.
  - `/feed/:id/remind-later` alias is not present; snooze is present.

## 6. What conflicts with the strategy?

- Some accumulated founder/Nhost hardening surfaces can feel operational if overemphasized. They should remain available but must not become the default product metaphor.
- Existing enum names are older than the latest product model. A big-bang migration would risk breaking working persistence and UI; compatibility-first expansion is safer.
- `apps/api` now uses `tsx --watch` for its `dev` script so it matches the ESM-safe local guidance.
- `apps/web/src/App.tsx` is a stale scaffold and should not be treated as runtime truth; Next uses `apps/web/app/page.tsx`.

## 7. What can be reused?

- Existing DB-backed BrainItem, Artifact, ThreadMessage, FeedCard, Task, Session, Event, and UserPreference infrastructure.
- Capture intake and related-items deterministic matching.
- Feed ranking/candidate generation and why-shown logic.
- Item detail timeline, comment composer, and AI ask flow.
- Plan preview, task creation, and session lifecycle.
- Shared design tokens and calm card/sheet component patterns.
- Client/domain API wrappers and tests.

## 8. What should be deferred?

- Persistent ExploreBoard/canvas schema.
- Full spatial graph editor.
- Calendar sync/time blocks.
- Collaboration/social remixing.
- Behavioral scoring.
- User-facing analytics dashboard.
- Mandatory task conversion.
- Required tags/folders/due dates during capture.
- Multi-agent AI orchestration.

## 9. What package boundaries are currently fragile?

- API and runtime code rely on workspace path exports directly into package source, which is acceptable for the current monorepo but should stay disciplined.
- Web `app/page.tsx` is a large orchestrator; new Explore logic should be moved into feature modules and shared UI components rather than further inflating the page.
- UI components must remain presentation-only; Explore networking and persistence should live in `packages/client` and app controllers.
- DB schema/repository should not absorb UX decisions such as canvas layout persistence before Explore is validated.

## 10. Safest next implementation step

1. Freeze docs and guardrails in the requested paths.
2. Add minimal Connection Card contracts and DB enum support.
3. Add deterministic preview/save endpoints that reuse BrainItems, ItemArtifacts, and FeedCards.
4. Wire web Explore prototype from Focus and Item Detail.
5. Add tests and only then broaden mobile parity and event taxonomy.

The guiding implementation constraint is: **Focus brings thoughts back; Explore helps thoughts combine; Time helps thoughts become action only when ready.**
