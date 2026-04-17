import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("POST /ai/summarize-cluster and /ai/next-step produce grounded short outputs", async () => {
  const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const captures = [
    "AI workflow tips for batching repetitive review steps",
    "Automation patterns for summarizing sprint notes quickly",
    "Prompt strategy for extracting repeated implementation risks"
  ];

  const createdItemIds: string[] = [];
  for (const content of captures) {
    const response = await app.inject({
      method: "POST",
      url: "/capture/intake",
      payload: {
        userId,
        type: "text",
        content,
        topicGuess: "AI workflow tips"
      }
    });
    assert.equal(response.statusCode, 201);
    const body = response.json<{ itemId: string }>();
    createdItemIds.push(body.itemId);
  }

  const summarize = await app.inject({
    method: "POST",
    url: "/ai/summarize-cluster",
    payload: { itemIds: createdItemIds }
  });
  assert.equal(summarize.statusCode, 201);
  const summaryBody = summarize.json<{
    summary: string;
    repeatedIdeas?: string[];
    suggestedNextAction: string;
    reason: string;
  }>();
  assert.ok(summaryBody.summary.length > 0);
  assert.ok(summaryBody.summary.split("\n").length <= 5);
  assert.ok(summaryBody.suggestedNextAction.length > 0);
  assert.ok(summaryBody.reason.length > 0);

  const nextStep = await app.inject({
    method: "POST",
    url: "/ai/next-step",
    payload: { itemIds: createdItemIds }
  });
  assert.equal(nextStep.statusCode, 201);
  const nextStepBody = nextStep.json<{
    summary: string;
    suggestedNextAction: string;
    reason: string;
  }>();
  assert.ok(nextStepBody.summary.length > 0);
  assert.ok(nextStepBody.suggestedNextAction.length > 0);
  assert.ok(nextStepBody.reason.length > 0);
});

test("cluster synthesis uses thread/task/session signals for grounded reasons", async () => {
  const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const intake = await app.inject({
    method: "POST",
    url: "/capture/intake",
    payload: {
      userId,
      type: "text",
      content: "Investigate API latency spikes during release checks",
      topicGuess: "Engineering"
    }
  });
  assert.equal(intake.statusCode, 201);
  const intakeBody = intake.json<{ itemId: string }>();

  const taskResp = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Latency check follow-up",
      sourceItemId: intakeBody.itemId
    }
  });
  assert.equal(taskResp.statusCode, 201);
  const task = taskResp.json<{ id: string }>();

  const session = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(session.statusCode, 201);
  const startedSession = session.json<{ id: string }>();
  const paused = await app.inject({
    method: "POST",
    url: `/sessions/${startedSession.id}/pause`,
    payload: {}
  });
  assert.equal(paused.statusCode, 200);

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    payload: { targetItemId: intakeBody.itemId, kind: "item_comment" }
  });
  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();
  const messageResp = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      threadId: thread.id,
      role: "user",
      content: "Still blocked waiting on production metrics dashboard."
    }
  });
  assert.equal(messageResp.statusCode, 201);

  const nextStep = await app.inject({
    method: "POST",
    url: "/ai/next-step",
    payload: { itemIds: [intakeBody.itemId] }
  });
  assert.equal(nextStep.statusCode, 201);
  const body = nextStep.json<{ suggestedNextAction: string; reason: string }>();
  assert.ok(/paused|session|task|thread/i.test(body.reason));
});
