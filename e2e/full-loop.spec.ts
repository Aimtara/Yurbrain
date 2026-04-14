import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../apps/api/src/server";

test.after(async () => {
  await app.close();
});

test("full loop: capture -> feed -> comment/query -> convert -> act", async () => {
  const userId = "77777777-7777-7777-7777-777777777777";

  const createdItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Follow up onboarding confusion",
      rawContent: "Users are confused in step 2, find low-risk fixes this week"
    }
  });
  assert.equal(createdItem.statusCode, 201);
  const item = createdItem.json<{ id: string; rawContent: string }>();

  const feed = await app.inject({ method: "GET", url: `/feed?userId=${userId}&lens=all&limit=5` });
  assert.equal(feed.statusCode, 200);
  const cards = feed.json<Array<{ id: string }>>();
  assert.ok(cards.length >= 1);

  const thread = await app.inject({
    method: "POST",
    url: "/threads",
    payload: { targetItemId: item.id, kind: "item_chat" }
  });
  assert.equal(thread.statusCode, 201);
  const threadData = thread.json<{ id: string }>();

  const query = await app.inject({
    method: "POST",
    url: "/ai/query",
    payload: { threadId: threadData.id, question: "What should I do first?" }
  });
  assert.equal(query.statusCode, 201);

  const convert = await app.inject({
    method: "POST",
    url: "/ai/convert",
    payload: {
      userId,
      sourceItemId: item.id,
      content: item.rawContent
    }
  });
  assert.equal(convert.statusCode, 201);
  const convertBody = convert.json<{ outcome: string; task?: { id: string } }>();
  assert.equal(convertBody.outcome, "create_task");
  assert.ok(convertBody.task?.id);

  const start = await app.inject({ method: "POST", url: `/tasks/${convertBody.task?.id}/start`, payload: {} });
  assert.equal(start.statusCode, 201);
  const session = start.json<{ id: string }>();

  const finish = await app.inject({ method: "POST", url: `/sessions/${session.id}/finish`, payload: {} });
  assert.equal(finish.statusCode, 200);
});
