# Two-User Isolation Smoke

_Status: required for staging signoff._

Use this smoke to prove a verified bearer for User B cannot access User A's
memory, continuation, task, session, Explore, or storage resources.

## Environment

```bash
export API_URL="https://<staging-api-url>"
export TOKEN_A="<valid staging bearer token for user A>"
export TOKEN_B="<valid staging bearer token for user B>"
```

All requests must include:

- `Authorization: Bearer <token>`
- `x-yurbrain-auth-mode: strict`
- `Content-Type: application/json` for requests with a body.

## BrainItem smoke

```bash
CREATE_RESPONSE=$(curl -s "$API_URL/brain-items" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "note",
    "title": "Staging private test item",
    "rawContent": "Only user A should access this."
  }')

echo "$CREATE_RESPONSE"
```

Set `ITEM_ID` from the response.

User A expected 200:

```bash
curl -i "$API_URL/brain-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict"
```

User B expected 404:

```bash
curl -i "$API_URL/brain-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict"
```

## Feed card smoke

User A expected card visible:

```bash
curl -i "$API_URL/feed?lens=all&limit=10" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict"
```

User B expected no User A card:

```bash
curl -i "$API_URL/feed?lens=all&limit=10" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict"
```

If a `FEED_CARD_ID` is extracted from User A's response, User B mutation should
return 404:

```bash
curl -i "$API_URL/feed/$FEED_CARD_ID/dismiss" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Thread/message smoke

User A creates a thread:

```bash
THREAD_RESPONSE=$(curl -s "$API_URL/threads" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d "{\"targetItemId\":\"$ITEM_ID\",\"kind\":\"item_comment\"}")
```

User B expected 404 when reading or posting:

```bash
curl -i "$API_URL/threads/$THREAD_ID" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict"

curl -i "$API_URL/messages" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":\"$THREAD_ID\",\"role\":\"user\",\"content\":\"cross-user attempt\"}"
```

## Task/session smoke

User A creates a task from the item:

```bash
TASK_RESPONSE=$(curl -s "$API_URL/tasks" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Private staging task\",\"sourceItemId\":\"$ITEM_ID\"}")
```

User B expected 404 on read/update/start:

```bash
curl -i "$API_URL/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict"

curl -i "$API_URL/tasks/$TASK_ID/start" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d '{}'
```

User A starts a session, then User B expected 404 on pause/finish:

```bash
SESSION_RESPONSE=$(curl -s "$API_URL/tasks/$TASK_ID/start" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d '{}')

curl -i "$API_URL/sessions/$SESSION_ID/pause" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-yurbrain-auth-mode: strict" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Explore smoke, if enabled

Create a second User A item, then verify:

- User A `POST /explore/connections/preview` succeeds.
- User B with the same `sourceItemIds` receives 404.
- User B cannot save a candidate using User A source IDs.

## Storage smoke

Current launch decision: storage object lifecycle is deferred. If storage is
later enabled, extend this smoke with:

- User A upload request for owned item.
- User A list/read succeeds.
- User B list/read/delete fails.
- Deleted object cannot be read.

## Evidence log

| Date | API URL | Release commit | User A result | User B denial result | Operator | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Staging smoke required |
