# Object Model v1

## Purpose
Freeze the minimum viable system objects for Yurbrain MVP.

## Core loop
Capture -> Resurface -> Continue -> Convert -> Act -> Return

## Core objects
- BrainItem
- ItemArtifact
- ItemThread
- ThreadMessage
- FeedCard
- Task
- Session
- Event
- UserPreference

## Explore prototype extension

Explore does not introduce a separate object universe. The first prototype stores
connections as `ItemArtifact(type = "connection")` with source lineage, then
optionally resurfaces the saved connection through `FeedCard(type = "connection")`.

Do not add a persistent `ExploreBoard` table for MVP. Canvas/tray selection state
is local UI state until users prove that saved boards are necessary.

## Guiding decisions
1. BrainItem is the semantic source of truth.
2. AI outputs are artifacts, not replacements.
3. Comments and item chat share the same thread/message architecture.
4. FeedCard is a first-class object, not a rendering helper.
5. Task creation is a conversion, not a default state.
6. Sessions, not tasks, are the execution truth.
7. Event logging starts on day 1.
8. Focus Feed is home; Explore is an optional mode launched from feed/detail.
9. Connection Cards are source-linked artifacts/cards, not new project/board objects.

## Current implementation notes

The current repository already persists the core loop with PGlite-backed
repositories. Some runtime names differ from the target language:

- tasks currently use `todo | in_progress | done`;
- sessions currently use `running | paused | finished`;
- threads currently target BrainItems directly;
- messages currently use `user | assistant | system` roles.

Those should be expanded incrementally instead of migrated in one big-bang change.
