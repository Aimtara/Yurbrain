import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("observability injects correlation id and preserves provided header", async () => {
  const userId = "cacacaca-caca-4aca-8aca-cacacacacaca";
  const headers = { "x-yurbrain-user-id": userId };
  const generated = await app.inject({ method: "GET", url: "/feed", headers });
  assert.equal(generated.statusCode, 200);
  assert.ok(generated.headers["x-correlation-id"]);

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
  assert.equal(response.json<{ message: string }>().message, "Thread not found");
});
