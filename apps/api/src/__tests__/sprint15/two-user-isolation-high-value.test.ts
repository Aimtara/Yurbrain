import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createTestJwt } from "../helpers/auth-token";
import { createServer } from "../../server";

async function buildHeaders(userId: string): Promise<Record<string, string>> {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

test("two-user isolation blocks cross-user read/search/ai/feed access", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTestMode = process.env.YURBRAIN_TEST_MODE;
  process.env.NODE_ENV = "test";
  process.env.YURBRAIN_TEST_MODE = "1";
  const dbPath = createDbPath("two-user-isolation");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userA = "11111111-2222-4333-8444-555555555555";
  const userB = "66666666-7777-4888-8999-000000000000";

  try {
    const userAHeaders = await buildHeaders(userA);
    const userBHeaders = await buildHeaders(userB);

    const captureResponse = await server.app.inject({
      method: "POST",
      url: "/capture/intake",
      headers: userAHeaders,
      payload: {
        type: "text",
        content: "User A private audit capture about nhost launch hardening.",
        topicGuess: "audit"
      }
    });
    assert.equal(captureResponse.statusCode, 201);
    const capture = captureResponse.json<{ itemId: string; item: { id: string; rawContent: string } }>();
    const itemId = capture.itemId;

    const readOwnItem = await server.app.inject({
      method: "GET",
      url: `/brain-items/${itemId}`,
      headers: userAHeaders
    });
    assert.equal(readOwnItem.statusCode, 200);

    const outsiderRead = await server.app.inject({
      method: "GET",
      url: `/brain-items/${itemId}`,
      headers: userBHeaders
    });
    assert.equal(outsiderRead.statusCode, 404);

    const ownerUpdate = await server.app.inject({
      method: "PATCH",
      url: `/brain-items/${itemId}`,
      headers: userAHeaders,
      payload: { title: "User A updated private capture" }
    });
    assert.equal(ownerUpdate.statusCode, 200);

    const outsiderUpdate = await server.app.inject({
      method: "PATCH",
      url: `/brain-items/${itemId}`,
      headers: userBHeaders,
      payload: { title: "Attacker edit" }
    });
    assert.equal(outsiderUpdate.statusCode, 404);

    const ownerSearch = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=private%20audit",
      headers: userAHeaders
    });
    assert.equal(ownerSearch.statusCode, 200);
    assert.ok(ownerSearch.json<Array<{ id: string }>>().some((entry) => entry.id === itemId));

    const outsiderSearch = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=private%20audit",
      headers: userBHeaders
    });
    assert.equal(outsiderSearch.statusCode, 200);
    assert.ok(!outsiderSearch.json<Array<{ id: string }>>().some((entry) => entry.id === itemId));

    const summarizeOwn = await server.app.inject({
      method: "POST",
      url: "/functions/summarize",
      headers: userAHeaders,
      payload: {
        itemId,
        rawContent: capture.item.rawContent
      }
    });
    assert.equal(summarizeOwn.statusCode, 201);

    const summarizeOutsider = await server.app.inject({
      method: "POST",
      url: "/functions/summarize",
      headers: userBHeaders,
      payload: {
        itemId,
        rawContent: capture.item.rawContent
      }
    });
    assert.equal(summarizeOutsider.statusCode, 404);

    const classifyOutsider = await server.app.inject({
      method: "POST",
      url: "/functions/classify",
      headers: userBHeaders,
      payload: {
        itemId,
        rawContent: capture.item.rawContent
      }
    });
    assert.equal(classifyOutsider.statusCode, 404);

    const threadResponse = await server.app.inject({
      method: "POST",
      url: "/threads",
      headers: userAHeaders,
      payload: {
        targetItemId: itemId,
        kind: "item_chat"
      }
    });
    assert.equal(threadResponse.statusCode, 201);
    const threadId = threadResponse.json<{ id: string }>().id;

    const queryOutsider = await server.app.inject({
      method: "POST",
      url: "/functions/query",
      headers: userBHeaders,
      payload: {
        threadId,
        question: "What should I do next?"
      }
    });
    assert.equal(queryOutsider.statusCode, 404);

    const convertOwn = await server.app.inject({
      method: "POST",
      url: "/functions/convert",
      headers: userAHeaders,
      payload: {
        sourceItemId: itemId,
        content: "Turn this private audit capture into a concrete task."
      }
    });
    assert.equal(convertOwn.statusCode, 201);
    const convertOwnBody = convertOwn.json<{ outcome: string; task?: { userId: string; sourceItemId: string | null } }>();
    assert.equal(convertOwnBody.outcome, "task_created");
    assert.equal(convertOwnBody.task?.userId, userA);
    assert.equal(convertOwnBody.task?.sourceItemId, itemId);

    const convertOutsider = await server.app.inject({
      method: "POST",
      url: "/functions/convert",
      headers: userBHeaders,
      payload: {
        sourceItemId: itemId,
        content: "Attempt to convert another user's private item."
      }
    });
    assert.equal(convertOutsider.statusCode, 404);

    const ownerFeed = await server.app.inject({
      method: "GET",
      url: "/functions/feed?lens=all&limit=10",
      headers: userAHeaders
    });
    assert.equal(ownerFeed.statusCode, 200);
    assert.ok(ownerFeed.json<Array<{ itemId: string | null }>>().some((entry) => entry.itemId === itemId));

    const outsiderFeed = await server.app.inject({
      method: "GET",
      url: "/functions/feed?lens=all&limit=10",
      headers: userBHeaders
    });
    assert.equal(outsiderFeed.statusCode, 200);
    assert.ok(!outsiderFeed.json<Array<{ itemId: string | null }>>().some((entry) => entry.itemId === itemId));

    const unauthenticatedRead = await server.app.inject({
      method: "GET",
      url: `/brain-items/${itemId}`
    });
    assert.equal(unauthenticatedRead.statusCode, 401);

    const invalidTokenRead = await server.app.inject({
      method: "GET",
      url: `/brain-items/${itemId}`,
      headers: {
        authorization: "Bearer definitely-not-a-valid-token",
        "x-yurbrain-auth-mode": "strict"
      }
    });
    assert.equal(invalidTokenRead.statusCode, 401);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousTestMode === undefined) {
      delete process.env.YURBRAIN_TEST_MODE;
    } else {
      process.env.YURBRAIN_TEST_MODE = previousTestMode;
    }
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
