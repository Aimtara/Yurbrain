import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createTestJwt } from "../helpers/auth-token";
import { createServer } from "../../server";

async function strictHeaders(userId: string): Promise<Record<string, string>> {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test("function summarize-progress returns concise grounded synthesis in strict mode", async () => {
  const server = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `sprint12-ai-synthesis-${process.pid}`)
  });
  const userId = "12121212-1212-4212-8212-121212121212";
  const headers = await strictHeaders(userId);

  try {
    const responses = await Promise.all(
      [
        "Investigate low-friction AI workflow tips for pull request triage.",
        "Capture repeatable AI prompts that improved coding continuity.",
        "Compare AI workflow tips for faster branch-level reviews."
      ].map((content) =>
        server.app.inject({
          method: "POST",
          url: "/capture/intake",
          headers,
          payload: {
            type: "text",
            content
          }
        })
      )
    );

    responses.forEach((response) => assert.equal(response.statusCode, 201));
    const itemIds = responses.map((response) => response.json<{ itemId: string }>().itemId);

    const synthesisResponse = await server.app.inject({
      method: "POST",
      url: "/functions/summarize-progress",
      headers,
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
    assert.match(body.summary, /Theme:/);
  } finally {
    await server.app.close();
  }
});

test("function next-step returns one grounded action in strict mode", async () => {
  const server = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `sprint12-ai-next-step-${process.pid}`)
  });
  const userId = "13131313-1313-4313-8313-131313131313";
  const headers = await strictHeaders(userId);

  try {
    const responses = await Promise.all(
      [
        "Need to unblock API migration checklist and ship one safe step.",
        "Document one deployment follow-up after migration.",
        "Collect one review-ready migration summary."
      ].map((content) =>
        server.app.inject({
          method: "POST",
          url: "/capture/intake",
          headers,
          payload: {
            type: "text",
            content
          }
        })
      )
    );

    responses.forEach((response) => assert.equal(response.statusCode, 201));
    const itemIds = responses.map((response) => response.json<{ itemId: string }>().itemId);

    const nextStepResponse = await server.app.inject({
      method: "POST",
      url: "/functions/what-should-i-do-next",
      headers,
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
    assert.match(`${body.suggestedNextAction} ${body.reason}`, /(next|recent|blocker|move|clear)/i);
  } finally {
    await server.app.close();
  }
});
