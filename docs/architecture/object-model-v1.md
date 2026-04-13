# Object Model v1

## Purpose
Freeze the minimum viable system objects for Yurbrain MVP.

## Core loop
Capture -> Resurface -> Comment/Query -> Convert -> Act

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

## Guiding decisions
1. BrainItem is the semantic source of truth.
2. AI outputs are artifacts, not replacements.
3. Comments and item chat share the same thread/message architecture.
4. FeedCard is a first-class object, not a rendering helper.
5. Task creation is a conversion, not a default state.
6. Sessions, not tasks, are the execution truth.
7. Event logging starts on day 1.
