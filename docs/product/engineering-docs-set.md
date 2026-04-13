# Yurbrain Engineering Docs Set

## 1. object-model-v1.md

### Purpose
Defines the core system objects for Yurbrain MVP.

### Design principles
- BrainItem is the source of truth
- AI outputs are stored as artifacts, not direct mutations
- Comments and item chat share one thread model
- FeedCard is a first-class object
- Task is a conversion, not a default
- Session is execution truth

### Core objects
- BrainItem
- ItemArtifact
- ItemThread
- ThreadMessage
- FeedCard
- Task
- Session
- Event
- UserPreference

### Relationships
```text
BrainItem
  -> ItemArtifact
  -> ItemThread -> ThreadMessage
  -> FeedCard
  -> Task -> Session
```

### Frozen enums
- treatment: undecided | keep_in_mind | open_loop | reference | task_candidate
- feed card type: item | digest | cluster | opportunity | open_loop | resume
- thread type: commentary | item_chat
- message type: comment | ai_query | ai_reply | system_note
- task status: ready | in_progress | paused | completed | dismissed
- session status: running | paused | completed | abandoned

### Explicit non-goals for MVP
Do not introduce:
- clusters as first-class runtime behavior
- time blocks
- calendar sync
- advanced analytics
- behavioral scoring

---

## 2. feed-logic-v1.md

### Purpose
Defines how the Focus feed behaves.

### Definition
The feed is a curated, stateful, ranked memory surface.

It is not:
- an inbox
- a task list
- a timeline
- an engagement stream

### Feed card types
- item
- digest
- cluster
- opportunity
- open_loop
- resume

### Feed lenses
- all
- keep_in_mind
- open_loops
- learning
- in_progress
- recently_commented

### Ranking inputs
- recency
- lens match
- continuity
- importance
- opportunity timing
- diversity penalty

### Required actions
- comment
- ask_ai
- plan
- remind_later
- dismiss
- open_original
- related

### Feed states
- active
- dismissed
- snoozed
- archived

### Rules
- feed is selective, not exhaustive
- feed is reversible
- feed must explain “why shown”
- feed must avoid duplicate topic flooding
- ignored cards decay naturally
- dismissed cards respect cooldown

---

## 3. ai-contracts-v1.md

### Contracts
- SummarizeContract
- ClassifyContract
- RelateContract
- FeedCardContract
- ItemChatContract
- TaskConversionContract

### Global rules
- structured outputs only
- validated before persistence
- confidence required
- grounding required where applicable
- no silent mutations of source objects

### Invocation rules
- on-demand for most user actions
- batched for feed generation
- never block UI on model response

### Fallback rules
- preserve source object
- fallback to deterministic UI
- retry only for transient errors

### Shared envelope
All AI endpoints return:
- success
- contractType
- contractVersion
- modelName
- promptVersion
- data or error
- createdAt

---

## 4. api-routes-v1.md

### Brain
- POST /brain-items
- GET /brain-items/:id
- GET /brain-items
- PATCH /brain-items/:id

### Threads
- POST /threads
- GET /threads/:id
- GET /threads/by-target
- POST /messages
- GET /threads/:id/messages

### Feed
- GET /feed
- POST /feed/:id/dismiss
- POST /feed/:id/snooze

### AI
- POST /ai/brain-items/:id/summarize
- POST /ai/brain-items/:id/classify
- POST /ai/brain-items/:id/relate
- POST /ai/brain-items/:id/query
- POST /ai/convert
- POST /ai/feed/generate-card

### Tasks
- POST /tasks
- GET /tasks/:id
- PATCH /tasks/:id
- GET /tasks
- POST /tasks/:id/start
- POST /sessions/:id/pause
- POST /sessions/:id/finish

---

## 5. do-not-build-yet.md

Do not build yet:
- full spatial canvas
- drag-and-drop clustering
- advanced feed personalization
- time block planning
- calendar sync
- behavioral analytics dashboards
- full media feed cards
- auto-taskification
- multi-agent per-service architecture
