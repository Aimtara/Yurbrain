# Yurbrain Agent Task Pack

## How to use
Attach the global instruction prefix to every ticket:

```md
You are working inside the Yurbrain monorepo.

Rules:
- Do not modify any frozen schemas, enums, or contract files unless the task explicitly asks for it.
- Do not introduce new domain objects.
- Follow existing Zod schemas and shared TypeScript types.
- Keep changes scoped to the requested files.
- Add tests for all business logic.
- Prefer deterministic code over clever abstractions.
- Do not build future-phase features.
- If a needed assumption is missing, use the simplest implementation consistent with the current MVP architecture.
```

## Sprint 1
### Ticket 1: Contracts package
- Implement Zod schemas and exported TS types for BrainItem, ItemArtifact, ItemThread, ThreadMessage, FeedCard, Task, Session, Event, UserPreference
- Add enum tests
- Keep schemas strict and minimal

### Ticket 2: Database schema + migrations
- Implement MVP tables and indexes
- Use UUID primary keys
- No future-phase tables

### Ticket 3: BrainItem CRUD
- POST /brain-items
- GET /brain-items/:id
- GET /brain-items
- PATCH /brain-items/:id
- Emit events on create/update

### Ticket 4: App shell
- Tabs: Brain, Focus, Time, Me
- Global CaptureComposer
- Clean/focus mode default
- Render mode scaffold only

## Sprint 2
### Ticket 5: Thread system
- POST /threads
- GET /threads/:id
- GET /threads/by-target

### Ticket 6: Message system
- POST /messages
- GET /threads/:id/messages

### Ticket 7: Brain item screen
- Show raw content
- Quick actions
- Comment preview

## Sprint 3
### Ticket 8: AI runner
- Response envelope
- Validation layer
- Timeout/fallback handling

### Ticket 9: Summarize endpoint
- POST /ai/brain-items/:id/summarize
- Cache + persist ItemArtifact

### Ticket 10: Classify endpoint
- POST /ai/brain-items/:id/classify
- Advisory only

### Ticket 11: Item chat endpoint
- POST /ai/brain-items/:id/query
- Persist assistant reply into item_chat thread

## Sprint 4
### Ticket 12: Feed candidate selector
- Deterministic candidate gathering

### Ticket 13: Feed card generator
- AI-backed card generation
- Deterministic fallback card

### Ticket 14: Feed ranking + diversity
- Deterministic ranking
- Configurable weights

### Ticket 15: GET /feed
- Lens support
- Limit support
- Exclude snoozed

### Ticket 16: Feed UI
- FeedLensBar
- FeedCard
- Inline CommentComposer

## Sprint 5
### Ticket 17: Task conversion endpoint
- POST /ai/convert
- Create task or return mini plan / not recommended

### Ticket 18: Task CRUD
- POST /tasks
- GET /tasks/:id
- PATCH /tasks/:id
- GET /tasks

### Ticket 19: Session start/finish
- POST /tasks/:id/start
- POST /sessions/:id/pause
- POST /sessions/:id/finish

### Ticket 20: Convert comment to task
- Manual confirmation in UI
- Preserve source linkage

## Sprint 6
### Ticket 21: Observability
- AI logs
- Feed refresh logs

### Ticket 22: Error states + fallbacks
- No dead-end states

### Ticket 23: QA flows
- End-to-end test for capture -> resurface -> comment/query -> convert -> act
