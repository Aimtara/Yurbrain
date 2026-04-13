# Feed Logic v1

The Focus feed is a curated, stateful, ranked memory surface.

It is not:
- an inbox
- a task list
- a timeline
- an engagement stream

## Card types
- item
- digest
- cluster
- opportunity
- open_loop
- resume

## Lenses
- all
- keep_in_mind
- open_loops
- learning
- in_progress
- recently_commented

## Implemented Sprint 4 behavior

### 1) Candidate selection (`gatherFeedCandidates`)
- starts from stored feed cards
- removes dismissed cards
- filters by `userId` when provided
- excludes snoozed cards unless `includeSnoozed=true`
- filters by lens (`all` means no lens filter)
- sorts deterministically by `createdAt` descending, then `id` ascending for ties

### 2) Card generation (`generateCardFromItem`)
- when a user requests `/feed` and there are no cards yet, cards are generated from that user's brain items
- generated cards are deterministic:
  - `cardType = item`
  - `lens` is selected by title-length modulo lens list
  - `body` uses normalized `rawContent` with length cap

### 3) Ranking (`rankFeedCards`)
- scores cards with deterministic signals:
  - recency score (newer cards score higher)
  - lens boost when card lens matches active lens
  - small refresh boost (`refreshCount`)
  - diversity penalty based on card-type frequency
- ties resolve deterministically using `createdAt`, then `id`

### 4) API behavior (`GET /feed`)
- supports query params:
  - `userId`
  - `lens`
  - `limit` (clamped to `1..50`, default `20`)
  - `includeSnoozed` (default `false`)
- applies candidate selection, then ranking, then limit

### 5) Card interaction state
- `POST /feed/:id/dismiss` marks card as dismissed
- `POST /feed/:id/snooze` sets `snoozedUntil`
- `POST /feed/:id/refresh` increments `refreshCount` and sets `lastRefreshedAt`

## Core rules
- selective, not exhaustive
- reversible
- why-shown always available
- diversity to avoid topic flooding
