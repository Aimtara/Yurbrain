# API Routes v1

Brain:
- POST /brain-items
- GET /brain-items/:id
- GET /brain-items
- PATCH /brain-items/:id
- GET /brain-items/:id/artifacts

Threads:
- POST /threads
- GET /threads/:id
- GET /threads/by-target
- POST /messages
- GET /threads/:id/messages

Feed:
- GET /feed
- POST /feed/:id/dismiss
- POST /feed/:id/snooze
- POST /feed/:id/refresh

Preferences:
- GET /preferences/:userId
- PUT /preferences/:userId

AI:
- POST /functions/summarize
- POST /functions/classify
- POST /functions/query
- POST /functions/convert
- POST /functions/feed/generate-card

Tasks:
- POST /tasks
- GET /tasks/:id
- PATCH /tasks/:id
- GET /tasks
- POST /tasks/:id/start
- GET /sessions
- POST /sessions/:id/pause
- POST /sessions/:id/finish

## Target compatibility additions

The current API uses `/functions/*` for AI-like routes. Keep those routes for existing clients while adding prompt-aligned aliases in small slices:

AI aliases:
- POST /ai/brain-items/:id/summarize
- POST /ai/brain-items/:id/classify
- POST /ai/brain-items/:id/query
- POST /ai/convert

Feed aliases:
- POST /feed/:id/remind-later

Explore prototype:
- POST /explore/connections/preview
- POST /explore/connections/save

Explore preview must not persist by default. Save persists an `ItemArtifact(type="connection")` plus a `FeedCard(cardType="connection")`; it must not introduce an ExploreBoard or separate object universe.

Implemented compatibility aliases:

- `POST /ai/brain-items/:id/summarize`
- `POST /ai/brain-items/:id/classify`
- `POST /ai/brain-items/:id/query`
- `POST /ai/convert`
- `POST /feed/:id/remind-later`

The older `/functions/*` routes remain supported for current clients.
