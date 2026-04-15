# Yurbrain Major Push — Detailed Cursor Ticket Prompts

Use this file as the prompt pack for the implementation board tracked in `docs/product/execution-tracker.md`.

## Global Cursor instruction block (paste first)

```md
You are working inside the Yurbrain monorepo.

Context:
Yurbrain is an AI-powered second brain centered on the loop:
Capture → Resurface → Comment/Query → Convert → Act.

Product principles:
- Capture first, decide later.
- The feed is not a to-do list; it is a memory surface.
- AI is assistive and optional, not forced.
- The system must be non-punitive and supportive.
- Focus Mode (structured) is the MVP default.
- Explore Mode (spatial/visual) must be architecturally possible later.
- Prefer deterministic ranking and behavior before AI enhancement.
- Preserve source linkage between captured items, comments, feed cards, tasks, and sessions.

Engineering rules:
- Do not modify frozen schemas or enums unless the task explicitly requires it.
- Do not introduce new domain objects unless absolutely necessary.
- Keep changes scoped to the requested task.
- Add or update tests for all new business logic.
- Prefer deterministic code over clever abstractions.
- Use existing packages and boundaries where possible.
- Avoid one-off hacks in app code when logic belongs in shared packages.
- Keep web and mobile parity in mind, but optimize MVP for Focus Mode first.

Output requirements:
- First inspect the existing files before changing anything.
- Then make a short implementation plan.
- Then implement.
- Then summarize exactly what changed, any assumptions, and any follow-up work.
```

---

## YB-101 — Capture Sheet

```md
Implement ticket YB-101: mobile-first Capture Sheet.

Goal:
Build a real Capture Sheet UX for Yurbrain that supports frictionless intake without requiring categorization upfront.

Product requirements:
- Use a bottom-sheet style surface on mobile and a modal/floating equivalent on web.
- Auto-focus the input immediately when opened.
- Use an auto-resizing text input.
- Do not require tags, folders, or due dates on the first screen.
- Include an attachment preview row placeholder for links/images/voice memos.
- Add primary and secondary actions:
  - Save
  - Save + Plan
  - Save + Remind Later
- Add a microphone icon button as a voice trigger stub.
- Add a subtle success micro-state before dismissing.

Implementation requirements:
- Reuse existing contracts and client APIs for BrainItem creation.
- If needed, add minimal UI primitives in packages/ui.
- Keep logic separated from presentation where possible.
- Support both mobile and web entry points if app scaffolding exists for both.
- Do not add complex capture metadata in this ticket.

Acceptance criteria:
- Opening capture focuses the input immediately.
- Save creates a BrainItem with minimal required fields.
- Save + Plan routes into the conversion/planning flow stub if available; otherwise add a TODO-friendly hook.
- Save + Remind Later routes into the postpone/remind flow stub if available; otherwise add a TODO-friendly hook.
- The UX feels lightweight and not form-heavy.

Please:
1. Inspect the repo to find the current capture-related components and routes.
2. Propose the minimal file change plan.
3. Implement the feature.
4. Add/update tests where appropriate.
5. Summarize changed files and follow-up items.
```

## YB-102 — FeedCard contract upgrade

```md
Implement ticket YB-102: upgrade the FeedCard contract and render model.

Goal:
Make feed cards expressive enough to support real resurfacing behavior and richer UI.

Requirements:
- Review the existing FeedCard contract and rendering usage.
- Add or derive fields needed for better resurfacing UX, such as:
  - whyShown
  - cardType
  - lens
  - primaryActions
  - commentPreview
  - sourceItemId
  - recencyBucket
  - resurfaceReason
  - dismissState
  - snoozeState
- Do not break current consumers.
- Prefer backward-compatible changes or controlled migration updates.
- Keep the contract aligned with the product requirement that feed cards explain why they appeared.

UI alignment:
The card should eventually support:
- why-shown pill
- card-type icon
- title/body preview
- quick action row
- comment preview

Implementation requirements:
- Update contracts first.
- Then update shared client types/selectors.
- Then update UI consumers.
- Add tests for any shared shaping or mapping logic.

Please:
1. Inspect existing feed card data shape and usages.
2. Propose the contract changes with minimal churn.
3. Implement across contracts/client/ui.
4. Add tests.
5. Summarize migration considerations.
```

## YB-103 — Feed lenses

```md
Implement ticket YB-103: FeedLensBar and deterministic lens filtering.

Goal:
Add lens-based browsing so users can slice their memory feed without search.

Lens set:
- All
- Keep in Mind
- Open Loops
- In Progress
- Learning
- Recently Commented

Requirements:
- Reuse existing feed enums/contracts if present; otherwise extend safely.
- Build or refine FeedLensBar in packages/ui.
- Wire lens selection into web and mobile feed surfaces if both exist.
- Implement deterministic filtering logic in a shared location when possible.
- Selected lens should visibly stand out.
- Default lens is All.
- Feed filtering should remain stable and testable.

Do not:
- Use AI for filtering.
- Hardcode app-specific duplicate logic in multiple places.

Please:
1. Inspect current feed rendering and lens support.
2. Implement shared filtering logic.
3. Connect it to UI state and feed requests/selectors.
4. Add tests for filtering behavior.
5. Summarize any follow-up required for ranking integration.
```

## YB-104 — Ranking v1

```md
Implement ticket YB-104: deterministic feed ranking v1.

Goal:
Make the feed feel intentional and explainable.

Ranking inputs to consider:
- recency
- postpone count
- comment activity
- in-progress state
- open-loop weight
- keep-in-mind/manual priority
- diversity penalty to avoid repetitive card types

Requirements:
- Ranking must be deterministic and testable.
- Do not require AI.
- Expose enough metadata so the UI can explain why a card appeared.
- Prefer a pure function or service module for ranking.
- If needed, add a lightweight score breakdown object for debugging and future tuning.

Acceptance criteria:
- Cards are sorted consistently for the same input set.
- There is a path to derive or display whyShown.
- Tests cover key ranking scenarios.

Please:
1. Inspect current feed generation/ranking path.
2. Add ranking logic in the correct backend/shared layer.
3. Update tests.
4. Summarize the weighting model clearly.
```

## YB-105 — CommentComposer with Ask Yurbrain

```md
Implement ticket YB-105: inline CommentComposer with Ask Yurbrain toggle.

Goal:
Allow lightweight continuation directly from feed cards and item detail.

Modes:
- Normal Comment
- Ask Yurbrain

Requirements:
- Add a toggle or segmented control in CommentComposer.
- Typing should expand input vertically.
- Submitting a normal comment appends inline immediately.
- Submitting Ask Yurbrain should append the user message and then the AI response if an AI endpoint already exists.
- If the AI endpoint is stubbed, integrate to the current best available behavior and leave clean TODOs where needed.
- Distinguish AI and user messages visually.

Implementation guidance:
- Reuse existing thread/message infrastructure.
- Preserve source linkage to the parent item/feed context.
- Keep composer reusable between feed card detail and brain item detail.

Please:
1. Inspect current comment/thread/message flow.
2. Update the shared CommentComposer component.
3. Integrate into at least one main feed/detail surface.
4. Add/update tests.
5. Summarize any API gaps that remain.
```

## YB-106 — Brain Item Detail

```md
Implement ticket YB-106: Brain Item Detail surface.

Goal:
Build the understanding surface for a single captured item.

Required sections:
- Header with back action and source type
- Original content block
- AI summary panel (optional/on-demand if supported)
- Suggested prompt chips
- Item chat panel
- Related items ribbon
- Quick action row:
  - Summarize
  - Similar items
  - Plan this
  - Comment
  - Keep in mind

Requirements:
- Use existing contracts and APIs where possible.
- AI should remain optional, not automatic.
- Related items can be simple initially if only lightweight similarity is available.
- The page/screen must support continuation without forcing the user into another workflow.

Please:
1. Inspect current item detail implementation.
2. Identify what can be reused.
3. Build the screen/surface with shared components where possible.
4. Add/update tests.
5. Summarize remaining gaps for related-items intelligence.
```

## YB-201 — Plan Preview

```md
Implement ticket YB-201: Plan Preview sheet.

Goal:
Create the bridge from thought/comment to action.

Requirements:
- Build an expandable sheet/modal titled Proposed Plan.
- Show total estimated time.
- Render a vertical list of generated task rows.
- Each row should support:
  - reorder handle
  - editable task title if feasible
  - editable duration
- Show a soft capacity warning if total estimate exceeds selected window.
- Actions:
  - Accept Plan
  - Edit
  - Start First Step

Guidance:
- Reuse existing task contracts and conversion outputs.
- Keep the warning supportive and non-punitive.
- Prioritize functional clarity over polish.

Please:
1. Inspect current convert/task creation path.
2. Implement the preview UI and supporting state.
3. Wire acceptance into real task creation.
4. Add/update tests.
5. Summarize any backend assumptions.
```

## YB-202 — Convert flow refinement

```md
Implement ticket YB-202: refine convert-to-task flow.

Goal:
Make conversion reliable, typed, and source-linked.

Requirements:
- Review the current conversion endpoint(s) and outputs.
- Ensure the system can distinguish between:
  - direct task creation
  - multi-step plan suggestion
  - not recommended / insufficient input
- Preserve source linkage:
  - source item id
  - source comment or thread id if relevant
- Keep outputs strongly typed and validated.

Please:
1. Inspect current convert routes/services/contracts.
2. Tighten the response model if needed.
3. Update the UI/client integration points.
4. Add tests.
5. Summarize how source linkage is preserved.
```

## YB-203 — Time Tab and window picker

```md
Implement ticket YB-203: Time Tab home and TimeWindowSelector.

Goal:
Create the execution home for choosing a planning horizon and seeing tasks that fit.

Time windows:
- 2h
- 4h
- 6h
- 8h
- 24h
- Custom

Requirements:
- Build a TimeWindowSelector component.
- Show resume card if a paused/running session exists.
- Show suggested tasks that fit the selected window.
- Add a prominent Start Without Planning action.
- Keep this screen simple and action-oriented.

Please:
1. Inspect existing task/session data flow.
2. Build the selector and home surface.
3. Connect suggested tasks logic using current task/session data.
4. Add/update tests.
5. Summarize any later enhancements needed for smarter allocation.
```

## YB-204 — Active Task / Focus Mode

```md
Implement ticket YB-204: Active Task / Focus Mode.

Goal:
Build the immersive execution screen.

Required elements:
- Large task title hero
- Session timer
- Pause button
- Finish button
- Context Peek section showing source context

Requirements:
- Use current task/session APIs.
- Keep the visual hierarchy calm and focused.
- Minimize distractions.
- Support both starting from an accepted plan and from an existing task.

Please:
1. Inspect current task/session UI and routes.
2. Build the active task screen.
3. Ensure pause/finish mutate real session state.
4. Add/update tests.
5. Summarize any UX follow-up items.
```

## YB-205 — Finish / Rebalance sheet

```md
Implement ticket YB-205: Finish / Rebalance sheet.

Goal:
Close a work session with immediate, supportive feedback and next-step guidance.

Required UI:
- Header like “Nice work” or “That took longer than expected. Let’s adjust.”
- Planned vs Actual time row
- Delta callout:
  - reclaimed time
  - overflow time
- Primary next moves:
  - Continue Plan
  - Rebalance Day
  - Take a Break
  - Schedule Rest Later

Requirements:
- No punitive language
- No harsh red-state treatment
- Sheet should appear after finishing a session
- Use existing task/session data where possible

Please:
1. Inspect current session-finish flow.
2. Build the sheet and hook it into finish.
3. Implement the simplest rebalance suggestion path that fits current architecture.
4. Add/update tests.
5. Summarize follow-up opportunities for smarter day rebalancing.
```

## YB-206 — Postpone / Reschedule sheet

```md
Implement ticket YB-206: Postpone / Reschedule sheet.

Goal:
Normalize postponing and make it fast.

Quick options:
- Later today
- Tomorrow
- Suggest a slot
- Break into smaller step

Requirements:
- One tap should complete the action.
- Specific date/time picker should be secondary and optional.
- Preserve postpone count/history if that exists or can be added cheaply.
- The result should influence later feed ranking and resurfacing.

Please:
1. Inspect current postpone/snooze behavior.
2. Build the sheet/modal.
3. Wire quick actions into existing task/feed logic.
4. Add/update tests.
5. Summarize what data is now available for future ranking improvements.
```

## YB-301 — Insights / Me tab

```md
Implement ticket YB-301: Me tab insights surface.

Goal:
Turn behavioral patterns into supportive reflection.

Required sections:
- top InsightCard
- postponement pattern
- estimation accuracy
- carry-forward pattern
- recommendation block

Requirements:
- Use plain language, not dashboard jargon.
- Keep the UI light and readable.
- Use available task/session/feed data to derive simple insights.
- If the full analytics layer is not ready, implement a minimal deterministic version.

Please:
1. Inspect current task/session/history data availability.
2. Propose a minimal insight set that can be computed now.
3. Build the surface.
4. Add/update tests for insight derivation logic.
5. Summarize what additional instrumentation would make this stronger later.
```

## YB-302 — Personalization settings

```md
Implement ticket YB-302: personalization settings.

Goal:
Allow the user to shape the system around their thinking style.

Required settings:
- Focus vs Explore mode toggle
- AI Summary Mode
- Feed Density
- Resurfacing Intensity

Requirements:
- Persist preferences using the current app architecture.
- The app should be able to read preferences even if not all settings fully affect behavior yet.
- Focus Mode remains the default.
- Explore Mode can be a placeholder preference for now.

Please:
1. Inspect current preference model and storage path.
2. Add or refine the settings UI.
3. Persist and read preferences.
4. Add/update tests.
5. Summarize which settings are fully active vs reserved for future behavior.
```

## YB-303 — Explore Mode data contract

```md
Implement ticket YB-303: Explore Mode data contract only.

Goal:
Prepare the architecture for a future spatial/visual rendering mode without building the full canvas UI yet.

Requirements:
- Add a contract/model for future explore rendering, including fields such as:
  - clusterId
  - x/y or layout position
  - salience/prominence
  - relationship/grouping metadata
  - manual grouping support
- Do not build the full UI in this ticket.
- Keep current Focus Mode behavior unchanged.
- Ensure the preference model can reference Explore Mode safely.

Please:
1. Inspect current contracts and rendering assumptions.
2. Add the minimal future-proof data contract.
3. Avoid breaking existing consumers.
4. Add/update tests.
5. Summarize how this avoids a future rewrite.
```

---

## Suggested “after each ticket” follow-up prompt

```md
Now perform a repo-wide review of your own changes.
Check for:
- broken imports
- contract drift
- duplicated logic
- missing tests
- places where shared logic should be extracted
Then apply any necessary cleanup changes.
```

## Suggested PR-summary follow-up prompt

```md
Now write a concise PR summary with:
- what changed
- why it changed
- follow-up work
- testing notes
```
