# API Notes (Sprint 2)

## Threads

- `POST /threads` creates an item-comment or item-chat thread.
- `GET /threads/:id` fetches a thread by id.
- `GET /threads/by-target?targetItemId=<uuid>` lists threads, optionally filtered by target item.

## Messages

- `POST /messages` appends a thread message.
- `GET /threads/:id/messages` lists all messages for a thread.

## Feed

- `GET /feed?userId=<uuid>` returns deterministic, non-dismissed stored feed cards in reverse-created order.
- `POST /ai/feed/generate-card` stores a placeholder/generated feed card for deterministic retrieval.
- `POST /feed/:id/dismiss` marks a feed card as dismissed.

## Manual task conversion

- `POST /tasks/manual-convert` creates a deterministic `todo` task from a user-provided item/comment content payload.

Example request body:

```json
{
  "userId": "11111111-1111-1111-1111-111111111111",
  "sourceItemId": "22222222-2222-2222-2222-222222222222",
  "content": "Draft the follow-up proposal by Friday"
}
```


## Validation and error mapping

- Request payloads are validated with Zod.
- Validation failures return `400` with `{ message, issues[] }`.
- Non-validation server failures return `500` with a generic message.
