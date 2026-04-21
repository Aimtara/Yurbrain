import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("core loop e2e: capture -> resurface -> comment -> AI -> plan -> act", async () => {
  const userId = "99999999-9999-4999-8999-999999999999";

  const createdItemResponse = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "idea",
      title: "Plan launch prep",
      rawContent: "Need to prepare release checklist and kickoff notes"
    }
  });

  assert.equal(createdItemResponse.statusCode, 201);
  const createdItem = createdItemResponse.json<{ id: string; rawContent: string }>();

  const feedResponse = await app.inject({
    method: "GET",
    url: "/feed",
    query: { userId, lens: "all", limit: "5" }
  });

  assert.equal(feedResponse.statusCode, 200);
  const feedCards = feedResponse.json<Array<{ itemId: string | null }>>();
  assert.ok(feedCards.some((card) => card.itemId === createdItem.id));

  const threadResponse = await app.inject({
    method: "POST",
    url: "/threads",
    payload: {
      targetItemId: createdItem.id,
      kind: "item_comment"
    }
  });

  assert.equal(threadResponse.statusCode, 201);
  const thread = threadResponse.json<{ id: string }>();

  const commentResponse = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      threadId: thread.id,
      role: "user",
      content: "This should become today's focused execution task"
    }
  });

  assert.equal(commentResponse.statusCode, 201);
  const comment = commentResponse.json<{ id: string; content: string }>();
  assert.match(comment.content, /focused execution/i);

  const summarizeResponse = await app.inject({
    method: "POST",
    url: "/functions/summarize",
    payload: {
      itemId: createdItem.id,
      rawContent: createdItem.rawContent
    }
  });

  assert.equal(summarizeResponse.statusCode, 201);
  const summary = summarizeResponse.json<{ type: string; ai: { content: string } }>();
  assert.equal(summary.type, "summary");
  assert.match(summary.ai.content, /Changed:/);
  assert.match(summary.ai.content, /Next:/);

  const convertResponse = await app.inject({
    method: "POST",
    url: "/functions/convert",
    payload: {
      userId,
      sourceItemId: createdItem.id,
      sourceMessageId: comment.id,
      content: comment.content
    }
  });

  assert.equal(convertResponse.statusCode, 201);
  const convertBody = convertResponse.json<{
    outcome: string;
    task?: { id: string; sourceItemId: string | null; sourceMessageId: string | null; status: string };
  }>();

  assert.equal(convertBody.outcome, "task_created");
  assert.equal(convertBody.task?.sourceItemId, createdItem.id);
  assert.equal(convertBody.task?.sourceMessageId, comment.id);

  const startSessionResponse = await app.inject({
    method: "POST",
    url: `/tasks/${convertBody.task?.id}/start`,
    payload: {}
  });

  assert.equal(startSessionResponse.statusCode, 201);
  const session = startSessionResponse.json<{ id: string; state: string }>();
  assert.equal(session.state, "running");

  const pauseSessionResponse = await app.inject({
    method: "POST",
    url: `/sessions/${session.id}/pause`,
    payload: {}
  });

  assert.equal(pauseSessionResponse.statusCode, 200);
  assert.equal(pauseSessionResponse.json<{ state: string }>().state, "paused");

  const finishSessionResponse = await app.inject({
    method: "POST",
    url: `/sessions/${session.id}/finish`,
    payload: {}
  });

  assert.equal(finishSessionResponse.statusCode, 200);
  assert.equal(finishSessionResponse.json<{ state: string }>().state, "finished");

  const taskResponse = await app.inject({ method: "GET", url: `/tasks/${convertBody.task?.id}` });

  assert.equal(taskResponse.statusCode, 200);
  assert.equal(taskResponse.json<{ status: string }>().status, "done");
});
