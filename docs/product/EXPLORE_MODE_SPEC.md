# Yurbrain Explore Mode Spec

_Version: MVP prototype spec — April 25, 2026._

## Product stance

Explore is a prototype-first connection mode layered on top of Yurbrain's existing continuity loop.

- **Focus Feed is home.**
- **Explore is optional.**
- **Explore uses the same objects as Focus.**
- **BrainItem remains the source of truth.**
- **Saved Explore output is a Connection Card, backed by an ItemArtifact and FeedCard.**
- **No persistent ExploreBoard is required for MVP.**

Mantra:

> Focus brings thoughts back. Explore helps thoughts combine. Time helps thoughts become action only when ready.

## What Explore is

Explore helps users combine saved thoughts, links, notes, comments, and resurfaced cards into grounded connections.

It should feel like:

- Notebook-style understanding
- Pinterest-style visual browsing
- Infinite Craft-style discovery
- calmer, source-linked, and less game-like

The central interaction:

1. Start from a resurfaced card or item detail.
2. Add 1–4 more cards.
3. Choose a connection mode.
4. Preview Yurbrain's connection suggestion.
5. Save, retry, plan, or dismiss.
6. Saved connection returns to Focus like any other Yurbrain object.

## User-facing language

Use:

- Card
- Explore
- Connection
- Connection Card
- Group
- Yurbrain suggestion

Avoid:

- Atom
- Fusion
- Artifact
- Cluster as a user-facing runtime concept
- AI output
- Graph editor

## Entry points

### FeedCard → Explore with this

1. User sees a card in Focus.
2. User chooses `Explore`.
3. Explore opens with that card pre-selected.
4. User taps related/recent cards to add.
5. User chooses a connection mode.

### Item Detail → Explore with related

1. User opens a BrainItem.
2. Related items are visible but not overwhelming.
3. User chooses `Explore with related`.
4. Explore opens with the current item plus selected related cards.

### Saved Connection Card → Add to Explore

1. User opens a saved Connection Card from Focus.
2. User can add it to Explore alongside source cards or new cards.

## Connection modes

| Mode | User intent | Output |
| --- | --- | --- |
| Pattern | What do these have in common? | Theme, recurring need, shared pattern |
| Idea | What could this become? | New concept, angle, possibility |
| Plan | What should I do with this? | Lightweight steps |
| Question | What should I think about next? | Better question or prompt |

## States and copy

### Empty

> Drop a few cards here. Yurbrain will help you find what connects them.

### One card

> Add another card to make a connection. Try something related, surprising, or unresolved.

### Loading

> Looking for the thread between these…

### Result

> Yurbrain noticed a possible connection.

### Save confirmation

> Saved. Yurbrain can bring this back later.

### AI failure

> Yurbrain could not make a good connection yet. Your cards are still here. Try adding one more or choosing a different mode.

### Too many cards

> This may be too much at once. Try connecting 2–5 cards first.

### Low confidence

> This connection may be loose. You can save it, try another angle, or add more context.

## Desktop prototype

Desktop may use a lightweight canvas layout:

- Left: card tray/search/recent cards
- Center: selected-card workspace
- Right: inspector, mode picker, suggestions
- Bottom/sheet: selected cards and actions

Requirements:

- Do not require persistent board management.
- Drag-and-drop may be added later, but tap/click select must work.
- Source cards remain visible in preview.

## Mobile prototype

Mobile must not depend on precision drag-and-drop.

Flow:

1. FeedCard → `Explore`
2. Bottom tray opens with current card selected.
3. User taps related/recent cards.
4. User chooses mode.
5. Connection preview appears in a sheet.
6. User saves, retries, plans, or dismisses.

## Connection preview anatomy

Every preview must show:

- Source cards
- Title
- Summary
- Why these connect
- Suggested next moves
- Confidence
- Actions:
  - Save Connection
  - Try another angle
  - Plan this
  - Dismiss

Trust language:

- “This may connect because…”
- “One possible angle…”
- “Yurbrain noticed…”
- “This could become…”

Avoid:

- “The answer is…”
- “You must…”
- “This proves…”

## Persistence model

Do persist:

- Saved Connection Card as `ItemArtifact(type="connection")`.
- A corresponding `FeedCard(type="connection")`.
- Source lineage inside artifact payload:
  - source item IDs
  - optional source artifact IDs
  - optional source comment IDs
  - connection mode
  - why these connect
  - suggested next actions
  - confidence

Do not persist for MVP:

- ExploreBoard
- Infinite canvas state
- Node positions as required state
- Custom graph edges as first-class objects

## API shape

Prototype endpoints:

- `POST /explore/connections/preview`
- `POST /explore/connections/save`
- `GET /brain-items/:id/related` (already present)

Preview does not persist candidates by default.

Save persists only the selected connection.

## Acceptance criteria

Explore prototype is acceptable when:

1. User understands “add cards to make a connection.”
2. User can add 2–5 cards.
3. User can choose Pattern, Idea, Plan, or Question.
4. Preview shows sources, why, next moves, and confidence.
5. User can save a Connection Card.
6. Saved Connection Card appears in Focus.
7. Explore does not become a second system to maintain.
8. No persistent board schema is introduced.

## Stop conditions

Pause and simplify if Explore work drifts toward:

- full graph editor
- persistent spatial board before validation
- collaboration/social remixing
- AI-generated media
- gamified points or leaderboards
- separate Explore-only object model
- a new default home screen
