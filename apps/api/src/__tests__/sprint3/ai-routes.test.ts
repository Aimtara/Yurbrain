import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("/ai/summarize returns validated output", async () => {
  const userId = "22222222-2222-4222-8222-222222222222";
  const itemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "AI summarize target",
      rawContent: "Summarize this content"
    }
  });
  assert.equal(itemResp.statusCode, 201);
  const item = itemResp.json<{ id: string }>();

  const resp = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: item.id,
      rawContent: "Summarize this content"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ fallbackUsed: boolean; ai: { content: string } }>();
  assert.equal(body.fallbackUsed, false);
  assert.match(body.ai.content, /Changed:/);
  assert.match(body.ai.content, /Next:/);
});

test("/ai/summarize uses fallback on invalid output", async () => {
  const userId = "22222222-2222-4222-8222-222222222223";
  const itemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "AI fallback summarize target",
      rawContent: "[force-invalid]"
    }
  });
  assert.equal(itemResp.statusCode, 201);
  const item = itemResp.json<{ id: string }>();

  const resp = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: item.id,
      rawContent: "[force-invalid]"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ fallbackUsed: boolean; fallbackReason?: string; ai: { content: string } }>();
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.fallbackReason, "invalid_or_runner_error");
  assert.match(body.ai.content, /Changed:/);
  assert.match(body.ai.content, /Next:/);
});

test("/ai/classify returns classification artifact", async () => {
  const userId = "22222222-2222-4222-8222-222222222224";
  const itemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "AI classify target",
      rawContent: "Can this be done today?"
    }
  });
  assert.equal(itemResp.statusCode, 201);
  const item = itemResp.json<{ id: string }>();

  const resp = await app.inject({
    method: "POST",
    url: "/ai/classify",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: item.id,
      rawContent: "Can this be done today?"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ type: string; ai: { content: string } }>();
  assert.equal(body.type, "classification");
  assert.match(body.ai.content, /CLASSIFY:/);
});

test("/ai/query uses fallback on timeout", async () => {
  const userId = "22222222-2222-4222-8222-222222222225";
  const itemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "AI query target",
      rawContent: "Question context"
    }
  });
  assert.equal(itemResp.statusCode, 201);
  const item = itemResp.json<{ id: string }>();

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      targetItemId: item.id,
      kind: "item_chat"
    }
  });

  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();
  const resp = await app.inject({
    method: "POST",
    url: "/ai/query",
    headers: { "x-yurbrain-user-id": userId },
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
  assert.match(body.message.content, /Recommendation:/);
  assert.match(body.message.content, /Next move:/);
});

test("/ai/query next-step response reflects linked todo task", async () => {
  const userId = "33333333-3333-4333-8333-333333333333";
  const itemResponse = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "Prepare launch notes",
      rawContent: "Need a concise launch summary and owner check."
    }
  });

  assert.equal(itemResponse.statusCode, 201);
  const item = itemResponse.json<{ id: string }>();

  const taskResponse = await app.inject({
    method: "POST",
    url: "/tasks",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      title: "Draft launch summary",
      sourceItemId: item.id
    }
  });
  assert.equal(taskResponse.statusCode, 201);

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      targetItemId: item.id,
      kind: "item_chat"
    }
  });

  const thread = threadResp.json<{ id: string }>();
  const resp = await app.inject({
    method: "POST",
    url: "/ai/query",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      threadId: thread.id,
      question: "What should I do next on this?"
    }
  });

  assert.equal(resp.statusCode, 201);
  const body = resp.json<{ message: { content: string } }>();
  assert.match(body.message.content, /Recommendation: Start the linked task now\./);
  assert.match(body.message.content, /Reason: A linked task already exists, so starting is the lowest-friction way forward\./);
  assert.match(body.message.content, /Next move: Start the linked task with one short session\./);
});
