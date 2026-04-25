import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";
import { createTestJwt } from "../helpers/auth-token";

process.env.NODE_ENV = "test";
process.env.YURBRAIN_TEST_MODE = "1";

async function strictHeaders(userId: string) {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test("prompt-compatible AI aliases map to existing item AI behavior", async () => {
  const { app } = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `alias-routes-${process.pid}-a`)
  });
  test.after(async () => {
    await app.close();
  });

  const userId = "abababab-abab-4bab-8bab-abababababab";
  const headers = await strictHeaders(userId);
  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers,
    payload: {
      type: "note",
      title: "Alias route test item",
      rawContent: "This item should support prompt-compatible AI aliases."
    }
  });
  assert.equal(created.statusCode, 201);
  const item = created.json<{ id: string; rawContent: string }>();

  const summarize = await app.inject({
    method: "POST",
    url: `/ai/brain-items/${item.id}/summarize`,
    headers,
    payload: { rawContent: item.rawContent }
  });
  assert.equal(summarize.statusCode, 201);
  assert.equal(summarize.json<{ type: string }>().type, "summary");

  const classify = await app.inject({
    method: "POST",
    url: `/ai/brain-items/${item.id}/classify`,
    headers,
    payload: { rawContent: item.rawContent }
  });
  assert.equal(classify.statusCode, 201);
  assert.equal(classify.json<{ type: string }>().type, "classification");

  const query = await app.inject({
    method: "POST",
    url: `/ai/brain-items/${item.id}/query`,
    headers,
    payload: { question: "What matters here?" }
  });
  assert.equal(query.statusCode, 201);
  assert.equal(query.json<{ userMessage: { content: string } }>().userMessage.content, "What matters here?");

  const convert = await app.inject({
    method: "POST",
    url: "/ai/convert",
    headers,
    payload: {
      sourceItemId: item.id,
      content: item.rawContent
    }
  });
  assert.equal(convert.statusCode, 201);
  assert.ok(["task_created", "plan_suggested", "not_recommended"].includes(convert.json<{ outcome: string }>().outcome));
});

test("feed remind-later alias snoozes a card with default duration", async () => {
  const { app } = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `alias-routes-${process.pid}-b`)
  });
  test.after(async () => {
    await app.close();
  });

  const userId = "bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc";
  const headers = await strictHeaders(userId);
  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers,
    payload: {
      type: "note",
      title: "Remind later alias item",
      rawContent: "This should create a feed card to remind later."
    }
  });
  assert.equal(created.statusCode, 201);
  const feed = await app.inject({ method: "GET", url: "/feed?lens=all&limit=5", headers });
  assert.equal(feed.statusCode, 200);
  const card = feed.json<Array<{ id: string }>>()[0];
  assert.ok(card?.id);

  const remind = await app.inject({
    method: "POST",
    url: `/feed/${card.id}/remind-later`,
    headers,
    payload: {}
  });
  assert.equal(remind.statusCode, 200);
  const body = remind.json<{ snoozeMinutes: number; snoozedUntil: string }>();
  assert.equal(body.snoozeMinutes, 180);
  assert.ok(body.snoozedUntil);
});
