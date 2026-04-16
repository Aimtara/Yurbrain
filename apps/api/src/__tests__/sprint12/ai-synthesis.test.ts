import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("POST /ai/summarize-cluster returns concise grounded synthesis", async () => {
  const userId = "12121212-1212-4212-8212-121212121212";
  const responses = await Promise.all(
    [
      "Investigate low-friction AI workflow tips for pull request triage.",
      "Capture repeatable AI prompts that improved coding continuity.",
      "Compare AI workflow tips for faster branch-level reviews."
    ].map((content) =>
      app.inject({
        method: "POST",
        url: "/capture/intake",
        payload: {
          userId,
          type: "text",
          content
        }
      })
    )
  );

  responses.forEach((response) => assert.equal(response.statusCode, 201));
  const itemIds = responses.map((response) => response.json<{ itemId: string }>().itemId);

  const synthesisResponse = await app.inject({
    method: "POST",
    url: "/ai/summarize-cluster",
    payload: { itemIds }
  });
  assert.equal(synthesisResponse.statusCode, 201);
  const body = synthesisResponse.json<{
    summary: string;
    repeatedIdeas: string[];
    suggestedNextAction: string;
    reason: string;
  }>();
  const bulletCount = body.summary
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ")).length;
  assert.ok(bulletCount >= 1);
  assert.ok(bulletCount <= 5);
  assert.ok(body.suggestedNextAction.length > 0);
  assert.ok(body.reason.length > 0);
});

test("POST /ai/next-step returns one grounded action", async () => {
  const userId = "13131313-1313-4313-8313-131313131313";
  const responses = await Promise.all(
    [
      "Need to unblock API migration checklist and ship one safe step.",
      "Document one deployment follow-up after migration.",
      "Collect one review-ready migration summary."
    ].map((content) =>
      app.inject({
        method: "POST",
        url: "/capture/intake",
        payload: {
          userId,
          type: "text",
          content
        }
      })
    )
  );

  responses.forEach((response) => assert.equal(response.statusCode, 201));
  const itemIds = responses.map((response) => response.json<{ itemId: string }>().itemId);

  const nextStepResponse = await app.inject({
    method: "POST",
    url: "/ai/next-step",
    payload: { itemIds }
  });
  assert.equal(nextStepResponse.statusCode, 201);
  const body = nextStepResponse.json<{
    summary: string;
    repeatedIdeas: string[];
    suggestedNextAction: string;
    reason: string;
  }>();
  assert.equal(body.summary.includes("\n"), false);
  assert.ok(body.summary.length > 0);
  assert.ok(body.suggestedNextAction.length > 0);
  assert.ok(body.reason.length > 0);
});
