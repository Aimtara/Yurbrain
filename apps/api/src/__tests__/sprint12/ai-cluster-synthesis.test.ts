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
  assert.equal(summarize.statusCode, 200);
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
  assert.equal(nextStep.statusCode, 200);
  const nextStepBody = nextStep.json<{
    summary: string;
    suggestedNextAction: string;
    reason: string;
  }>();
  assert.ok(nextStepBody.summary.length > 0);
  assert.ok(nextStepBody.suggestedNextAction.length > 0);
  assert.ok(nextStepBody.reason.length > 0);
});
