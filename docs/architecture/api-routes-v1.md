# API Routes v1

Brain:
- POST /brain-items
- GET /brain-items/:id
- GET /brain-items
- PATCH /brain-items/:id

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

AI:
- POST /ai/brain-items/:id/summarize
- POST /ai/brain-items/:id/classify
- POST /ai/brain-items/:id/relate
- POST /ai/brain-items/:id/query
- POST /ai/convert
- POST /ai/feed/generate-card

Tasks:
- POST /tasks
- GET /tasks/:id
- PATCH /tasks/:id
- GET /tasks
- POST /tasks/:id/start
- POST /sessions/:id/pause
- POST /sessions/:id/finish
