import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test("thread -> message -> list and manual convert flow", async () => {
  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    payload: {
      targetItemId: "22222222-2222-2222-2222-222222222222",
      kind: "item_comment"
    }
  });

  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();

  const messageResp = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      threadId: thread.id,
      role: "user",
      content: "ship deterministic loop"
    }
  });

  assert.equal(messageResp.statusCode, 201);

  const listResp = await app.inject({ method: "GET", url: `/threads/${thread.id}/messages` });
  assert.equal(listResp.statusCode, 200);
  assert.equal(listResp.json<Array<{ content: string }>>()[0]?.content, "ship deterministic loop");

  const convertResp = await app.inject({
    method: "POST",
    url: "/tasks/manual-convert",
    payload: {
      userId: "11111111-1111-1111-1111-111111111111",
      sourceItemId: "22222222-2222-2222-2222-222222222222",
      content: "Draft summary"
    }
  });

  assert.equal(convertResp.statusCode, 201);
});
