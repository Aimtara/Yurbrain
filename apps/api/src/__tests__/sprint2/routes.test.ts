import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("thread -> message -> list and manual convert flow", async () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const itemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "Thread target",
      rawContent: "Thread + message + convert integration target"
    }
  });

  assert.equal(itemResp.statusCode, 201);
  const item = itemResp.json<{ id: string }>();

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      targetItemId: item.id,
      kind: "item_comment"
    }
  });

  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();

  const messageResp = await app.inject({
    method: "POST",
    url: "/messages",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      threadId: thread.id,
      role: "user",
      content: "ship deterministic loop"
    }
  });

  assert.equal(messageResp.statusCode, 201);

  const listResp = await app.inject({
    method: "GET",
    url: `/threads/${thread.id}/messages`,
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(listResp.statusCode, 200);
  assert.equal(listResp.json<Array<{ content: string }>>()[0]?.content, "ship deterministic loop");

  const convertResp = await app.inject({
    method: "POST",
    url: "/tasks/manual-convert",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      sourceItemId: item.id,
      content: "Draft summary"
    }
  });

  assert.equal(convertResp.statusCode, 201);
});
