import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../apps/api/src/server";

function createUnsignedJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.`;
}

function buildStrictHeaders(userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${createUnsignedJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test.after(async () => {
  await app.close();
});

test("full loop: capture -> feed -> comment/query -> convert -> act", async () => {
  const userId = "77777777-7777-4777-8777-777777777777";
  const strictHeaders = buildStrictHeaders(userId);

  const createdItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: strictHeaders,
    payload: {
      type: "note",
      title: "Follow up onboarding confusion",
      rawContent: "Users are confused in step 2, find low-risk fixes this week"
    }
  });
  assert.equal(createdItem.statusCode, 201);
  const item = createdItem.json<{ id: string; rawContent: string }>();

  const feed = await app.inject({ method: "GET", url: "/feed?lens=all&limit=5", headers: strictHeaders });
  assert.equal(feed.statusCode, 200);
  const cards = feed.json<Array<{ id: string }>>();
  assert.ok(cards.length >= 1);

  const thread = await app.inject({
    method: "POST",
    url: "/threads",
    headers: strictHeaders,
    payload: { targetItemId: item.id, kind: "item_chat" }
  });
  assert.equal(thread.statusCode, 201);
  const threadData = thread.json<{ id: string }>();

  const query = await app.inject({
    method: "POST",
    url: "/functions/query",
    headers: strictHeaders,
    payload: { threadId: threadData.id, question: "What should I do first?" }
  });
  assert.equal(query.statusCode, 201);

  const convert = await app.inject({
    method: "POST",
    url: "/functions/convert",
    headers: strictHeaders,
    payload: {
      sourceItemId: item.id,
      content: item.rawContent
    }
  });
  assert.equal(convert.statusCode, 201);
  const convertBody = convert.json<{ outcome: string; task?: { id: string } }>();
  assert.equal(convertBody.outcome, "task_created");
  assert.ok(convertBody.task?.id);

  const start = await app.inject({
    method: "POST",
    url: `/tasks/${convertBody.task?.id}/start`,
    headers: strictHeaders,
    payload: {}
  });
  assert.equal(start.statusCode, 201);
  const session = start.json<{ id: string }>();

  const finish = await app.inject({
    method: "POST",
    url: `/sessions/${session.id}/finish`,
    headers: strictHeaders,
    payload: {}
  });
  assert.equal(finish.statusCode, 200);
});
