import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("observability injects correlation id and preserves provided header", async () => {
  const userId = "cacacaca-caca-4aca-8aca-cacacacacaca";
  const headers = { "x-yurbrain-user-id": userId };
  const messages: Array<{ msg?: string; url?: string }> = [];
  app.log.info = ((payload: unknown, msg?: string) => {
    if (payload && typeof payload === "object") {
      const url = (payload as { url?: unknown }).url;
      messages.push({ msg, url: typeof url === "string" ? url : undefined });
    }
  }) as typeof app.log.info;
  const generated = await app.inject({ method: "GET", url: "/feed?token=secret-token", headers });
  assert.equal(generated.statusCode, 200);
  assert.ok(generated.headers["x-correlation-id"]);
  const completionLog = messages.find((entry) => entry.msg === "request completed" && entry.url?.startsWith("/feed"));
  assert.equal(completionLog?.url, "/feed");

  const provided = await app.inject({
    method: "GET",
    url: "/feed",
    headers: { ...headers, "x-correlation-id": "corr-test-123" }
  });
  assert.equal(provided.statusCode, 200);
  assert.equal(provided.headers["x-correlation-id"], "corr-test-123");
});

test("error envelope includes correlation id and structured error details", async () => {
  const userId = "cbcbcbcb-cbcb-4bcb-8bcb-cbcbcbcbcbcb";
  const response = await app.inject({
    method: "POST",
    url: "/functions/summarize",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: "not-a-uuid",
      rawContent: "content"
    }
  });

  assert.equal(response.statusCode, 400);
  const body = response.json<{ error: { message: string; statusCode: number; correlationId?: string; details?: unknown[] } }>();
  assert.equal(body.error.message, "Validation failed");
  assert.equal(body.error.statusCode, 400);
  assert.ok(body.error.correlationId);
  assert.ok(Array.isArray(body.error.details));
});

test("auth required returns safe structured envelope", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/feed"
  });

  assert.equal(response.statusCode, 401);
  assert.ok(response.headers["x-request-id"]);
  assert.ok(response.headers["x-correlation-id"]);
  const body = response.json<{
    message: string;
    requestId?: string;
    error: {
      code?: string;
      message: string;
      statusCode: number;
      correlationId?: string;
    };
  }>();
  assert.equal(body.message, "Current user identity is required. Provide Authorization: Bearer <token>.");
  assert.equal(body.error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(body.error.statusCode, 401);
  assert.ok(body.error.correlationId);
  assert.equal(body.error.message, body.message);
  assert.equal(body.requestId, response.headers["x-request-id"]);
});

test("ai query returns deterministic not-found envelope for missing thread", async () => {
  const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const response = await app.inject({
    method: "POST",
    url: "/functions/query",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      threadId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      question: "What is next?"
    }
  });

  assert.equal(response.statusCode, 404);
  const body = response.json<{
    message: string;
    error: {
      code?: string;
      statusCode: number;
      correlationId?: string;
    };
  }>();
  assert.equal(body.message, "Thread not found");
  assert.equal(body.error.code, "THREAD_NOT_FOUND");
  assert.equal(body.error.statusCode, 404);
  assert.ok(body.error.correlationId);
});
