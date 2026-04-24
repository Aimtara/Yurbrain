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
- GET /preferences/me
- PUT /preferences/me
- GET /preferences/:userId
- PUT /preferences/:userId

AI:
- POST /functions/summarize
- POST /functions/classify
- POST /functions/query
- POST /functions/convert
- POST /functions/summarize-progress
- POST /functions/what-should-i-do-next
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
