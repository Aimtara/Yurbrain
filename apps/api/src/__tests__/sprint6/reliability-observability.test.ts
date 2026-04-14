import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("observability injects correlation id and preserves provided header", async () => {
  const generated = await app.inject({ method: "GET", url: "/feed" });
  assert.equal(generated.statusCode, 200);
  assert.ok(generated.headers["x-correlation-id"]);

  const provided = await app.inject({
    method: "GET",
    url: "/feed",
    headers: { "x-correlation-id": "corr-test-123" }
  });
  assert.equal(provided.statusCode, 200);
  assert.equal(provided.headers["x-correlation-id"], "corr-test-123");
});

test("error envelope includes correlation id and structured error details", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/ai/summarize",
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
  const response = await app.inject({
    method: "POST",
    url: "/ai/query",
    payload: {
      threadId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      question: "What is next?"
    }
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json<{ message: string }>().message, "Thread not found");
});
