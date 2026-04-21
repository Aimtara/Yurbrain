import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

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

test("strict auth core loop smoke: capture -> feed -> item detail -> comments -> plan -> session -> founder review", async () => {
  const server = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `strict-auth-core-loop-${process.pid}`)
  });
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const strictHeaders = buildStrictHeaders(userId);

  try {
    const authMe = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: strictHeaders
    });
    assert.equal(authMe.statusCode, 200);
    assert.equal(authMe.json<{ id: string; source: string }>().id, userId);

    const captureResponse = await server.app.inject({
      method: "POST",
      url: "/capture/intake",
      headers: strictHeaders,
      payload: {
        type: "text",
        content: "Strict auth loop capture",
        source: "strict_auth_test"
      }
    });
    assert.equal(captureResponse.statusCode, 201);
    const capture = captureResponse.json<{ item: { id: string; rawContent: string } }>();
    const itemId = capture.item.id;

    const feedResponse = await server.app.inject({
      method: "GET",
      url: "/feed",
      headers: strictHeaders,
      query: { lens: "all", limit: "5" }
    });
    assert.equal(feedResponse.statusCode, 200);
    const feedCards = feedResponse.json<Array<{ itemId: string | null }>>();
    assert.ok(feedCards.some((card) => card.itemId === itemId));

    const itemDetailResponse = await server.app.inject({
      method: "GET",
      url: `/brain-items/${itemId}`,
      headers: strictHeaders
    });
    assert.equal(itemDetailResponse.statusCode, 200);

    const threadResponse = await server.app.inject({
      method: "POST",
      url: "/threads",
      headers: strictHeaders,
      payload: {
        targetItemId: itemId,
        kind: "item_comment"
      }
    });
    assert.equal(threadResponse.statusCode, 201);
    const threadId = threadResponse.json<{ id: string }>().id;

    const messageResponse = await server.app.inject({
      method: "POST",
      url: "/messages",
      headers: strictHeaders,
      payload: {
        threadId,
        role: "user",
        content: "Plan this strict-auth item for execution"
      }
    });
    assert.equal(messageResponse.statusCode, 201);
    const message = messageResponse.json<{ id: string; content: string }>();

    const listMessagesResponse = await server.app.inject({
      method: "GET",
      url: `/threads/${threadId}/messages`,
      headers: strictHeaders
    });
    assert.equal(listMessagesResponse.statusCode, 200);
    assert.ok(
      listMessagesResponse
        .json<Array<{ id: string; content: string }>>()
        .some((entry) => entry.id === message.id)
    );

    const manualConvertResponse = await server.app.inject({
      method: "POST",
      url: "/tasks/manual-convert",
      headers: strictHeaders,
      payload: {
        sourceItemId: itemId,
        content: message.content
      }
    });
    assert.equal(manualConvertResponse.statusCode, 201);
    const taskId = manualConvertResponse.json<{ id: string }>().id;

    const startSessionResponse = await server.app.inject({
      method: "POST",
      url: `/tasks/${taskId}/start`,
      headers: strictHeaders,
      payload: {}
    });
    assert.equal(startSessionResponse.statusCode, 201);
    const sessionId = startSessionResponse.json<{ id: string; state: string }>().id;

    const pauseSessionResponse = await server.app.inject({
      method: "POST",
      url: `/sessions/${sessionId}/pause`,
      headers: strictHeaders,
      payload: {}
    });
    assert.equal(pauseSessionResponse.statusCode, 200);
    assert.equal(pauseSessionResponse.json<{ state: string }>().state, "paused");

    const finishSessionResponse = await server.app.inject({
      method: "POST",
      url: `/sessions/${sessionId}/finish`,
      headers: strictHeaders,
      payload: {}
    });
    assert.equal(finishSessionResponse.statusCode, 200);
    assert.equal(finishSessionResponse.json<{ state: string }>().state, "finished");

    const founderReviewResponse = await server.app.inject({
      method: "GET",
      url: "/founder-review",
      headers: strictHeaders
    });
    assert.equal(founderReviewResponse.statusCode, 200);
  } finally {
    await server.app.close();
  }
});
