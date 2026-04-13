import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test("/ai/summarize returns validated output", async () => {
  const resp = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    payload: {
      itemId: "22222222-2222-2222-2222-222222222222",
      rawContent: "Summarize this content"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ fallbackUsed: boolean; ai: { content: string } }>();
  assert.equal(body.fallbackUsed, false);
  assert.match(body.ai.content, /SUMMARIZE:/);
});

test("/ai/summarize uses fallback on invalid output", async () => {
  const resp = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    payload: {
      itemId: "22222222-2222-2222-2222-222222222222",
      rawContent: "[force-invalid]"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ fallbackUsed: boolean; fallbackReason?: string; ai: { content: string } }>();
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.fallbackReason, "invalid_or_runner_error");
  assert.match(body.ai.content, /Fallback summary/);
});

test("/ai/classify returns classification artifact", async () => {
  const resp = await app.inject({
    method: "POST",
    url: "/ai/classify",
    payload: {
      itemId: "22222222-2222-2222-2222-222222222222",
      rawContent: "Can this be done today?"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ type: string; ai: { content: string } }>();
  assert.equal(body.type, "classification");
  assert.match(body.ai.content, /CLASSIFY:/);
});

test("/ai/query uses fallback on timeout", async () => {
  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    payload: {
      targetItemId: "22222222-2222-2222-2222-222222222222",
      kind: "item_chat"
    }
  });

  const thread = threadResp.json<{ id: string }>();
  const resp = await app.inject({
    method: "POST",
    url: "/ai/query",
    payload: {
      threadId: thread.id,
      question: "[force-timeout] what did I ask?",
      timeoutMs: 200
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ fallbackUsed: boolean; fallbackReason?: string; userMessage: { role: string }; message: { role: string; content: string } }>();
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.fallbackReason, "timeout");
  assert.equal(body.userMessage.role, "user");
  assert.equal(body.message.role, "assistant");
  assert.match(body.message.content, /deterministic fallback/i);
});
