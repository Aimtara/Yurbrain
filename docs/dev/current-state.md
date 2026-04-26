# Yurbrain Development Current State

_Last audited: April 26, 2026 after enterprise production-hardening local/CI gate completion._

This is the implementation-truth audit for the current repository. It is intentionally factual: it records what is present today, what remains mocked or deferred, and the safest next steps for continuing the Yurbrain core loop without turning the product into a dashboard, task manager, or separate Explore system.

## 1. What exists?

- **Monorepo foundation:** pnpm workspaces + Turborepo with `apps/api`, `apps/web`, `apps/mobile`, and shared packages for contracts, DB, UI, client, AI, and Nhost support.
- **API:** Fastify API in `apps/api` with route modules for BrainItems, capture, threads, messages, preferences, feed, tasks, sessions, Explore, and function/AI routes.
- **Persistence:** `packages/db` provides a PGlite + Drizzle repository and startup migrations.
- **Contracts:** `packages/contracts` provides Zod schemas for current BrainItem, Artifact, Thread, Message, FeedCard, Task, Session, Event, and UserPreference shapes.
- **Client:** `packages/client` provides endpoint wrappers, domain client methods, React hooks, and a higher-level Yurbrain client.
- **UI:** `packages/ui` provides shared components for capture, feed cards/lenses/comments, item detail/chat, planning, task/session screens, Time/Me supporting surfaces, and the Explore prototype screen.
- **Web app:** `apps/web/app/page.tsx` is the primary integrated full-loop surface. It supports Focus, Item Detail, Explore, Time, Me, capture, feed interactions, comments, ask, plan, sessions, preferences, and Nhost auth gating.
- **Mobile app:** `apps/mobile` has a lighter Focus/Explore/Time/Me/Item/Capture loop with tap-friendly interactions.
- **AI:** deterministic local AI runner/fallback behavior exists for summarize/classify/query and Explore connection suggestions, plus provider scaffolding for selected synthesis routes.
- **Testing:** API, contracts, client, DB, UI, AI, mobile, and end-to-end smoke tests exist.

## 2. What is mocked or placeholder?

- AI remains mostly deterministic/local-stub for the product-critical loop. Real provider scaffolding exists for selected synthesis functions, but capture/feed/comment/task/session flows do not require external model credentials.
- Explore is prototype-level: preview/save are deterministic and source-grounded, the canvas/tray state is local UI state, and saved connections persist as artifacts/feed cards. There is no persistent ExploreBoard or graph editor.
- Voice capture, native file uploads from the capture sheet, and richer media feed cards remain post-alpha. Web production-mode capture hides post-alpha voice/reminder affordances, and mobile hides image/file upload mode unless `EXPO_PUBLIC_YURBRAIN_STORAGE_ENABLED=true`.
- `/events` is intentionally disabled for reads until authentication and per-user event filtering are implemented, though internal event rows exist.
- All workspaces now expose `typecheck`, `lint`, and `build` scripts. Library/mobile build scripts are documented no-ops where packages are source-consumed or mobile production build is deferred.

## 3. What is persisted?

- BrainItems, ItemArtifacts, item threads, thread messages, FeedCards, tasks, sessions, events, profiles, attachments, and user preferences are persisted in PGlite.
- Saved Connection Cards persist as `ItemArtifact(type="connection")` plus `FeedCard(cardType="connection")`.
- Feed dismiss/snooze/refresh/postpone metadata persists.
- AI summary/classification artifacts persist.
- Item chat replies and user comments persist as thread messages.
- Founder mode, render mode, AI summary mode, feed density, resurfacing intensity, and default lens persist in user preferences.

## 4. What is in-memory or browser-local?

- No critical API runtime path currently depends on route-level in-memory `Map` state.
- Web UI selection state is local/browser state: active surface, selected item/task, open sheets, search inputs, pending plan/postpone/finish sheets, and Explore state once added.
- Explore workspace selection state is intentionally local; only saved Connection Cards persist as artifacts/feed cards.

## 5. What is missing?

- Explore still needs production validation and polish:
  - richer usability testing,
  - optional real-provider connection generation,
  - deeper source lineage display for comments/artifacts,
  - and more refined mobile presentation.
- Contract/schema gaps that remain:
  - Current task/session/thread/message naming differs from the frozen target model.
- Deferred API/object-model work:
  - generic thread targets remain deferred,
  - `/events` read access remains disabled,
  - and task/session status migration remains deferred.

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

## 10. Package quality-gate coverage

Current package scripts should be treated as production-hardening inputs, not production proof:

| Workspace | Current coverage | Gap / rationale |
| --- | --- | --- |
| `apps/api` | `test`, `lint`, `typecheck`, `build` via Turbo no-op absence, `dev/start` | Strongest production-impacting runtime gate; API tests include authz/rate-limit/health smoke. |
| `apps/web` | `build`, `typecheck`, `lint`, documented no-op `test`, `dev/start` | Web build passes locally and in CI; web-first production still requires staging smoke evidence. |
| `apps/mobile` | `test`, `typecheck`, `lint`, documented deferred `build`, `dev/start` | Mobile remains preview until production smoke evidence or explicit launch deferral signoff. |
| `@yurbrain/ai` | `test`, `typecheck`, `lint`, documented source-consumed `build` | No package artifact emitted. |
| `@yurbrain/client` | `test`, `typecheck`, `lint`, documented source-consumed `build` | Client auth/session tests cover Nhost transport helpers. |
| `@yurbrain/contracts` | `test`, `typecheck`, `lint`, documented source-consumed `build` | Schema library is source-consumed in monorepo. |
| `@yurbrain/db` | `test`, `typecheck`, `lint`, documented source-consumed `build`, migration/seed/reset scripts | Storage metadata and local backup/restore smoke are included in storage smoke. |
| `@yurbrain/nhost` | `test` no-op with coverage rationale, `typecheck`, `lint`, documented source-consumed `build` | Config helpers are covered through client tests. |
| `@yurbrain/ui` | `test`, `typecheck`, `lint`, documented source-consumed `build` | Capture storage-deferral UI guard test is included. |

## 11. Safest next implementation step

1. Do not claim production readiness from local/CI gates alone.
2. Complete the staging signoff packet with real environment evidence:
   - staging web/core-loop smoke,
   - real JWT issuer/audience/JWKS validation,
   - two-user isolation,
   - CORS allowlist rejection,
   - dashboards/alerts,
   - rollback and managed backup/restore drills.
3. Keep storage/attachments production-deferred unless the full upload/read/list/delete object lifecycle is implemented and evidenced.
4. Keep mobile preview/deferred until mobile production smoke evidence exists.
5. Continue using the release board and current verification status docs as the source of truth.

The guiding implementation constraint is: **Focus brings thoughts back; Explore helps thoughts combine; Time helps thoughts become action only when ready.**
