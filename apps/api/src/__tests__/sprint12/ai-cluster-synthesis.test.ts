import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createServer } from "../../server";

function createUnsignedJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.`;
}

function strictHeaders(userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${createUnsignedJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test("function next-step stays grounded with thread/task/session context in strict mode", async () => {
  const server = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `sprint12-ai-cluster-${process.pid}`)
  });
  const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const headers = strictHeaders(userId);

  try {
    const intake = await server.app.inject({
      method: "POST",
      url: "/capture/intake",
      headers,
      payload: {
        type: "text",
        content: "Investigate API latency spikes during release checks",
        topicGuess: "Engineering"
      }
    });
    assert.equal(intake.statusCode, 201);
    const intakeBody = intake.json<{ itemId: string }>();

    const taskResp = await server.app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: {
        title: "Latency check follow-up",
        sourceItemId: intakeBody.itemId
      }
    });
    assert.equal(taskResp.statusCode, 201);
    const task = taskResp.json<{ id: string }>();

    const session = await server.app.inject({
      method: "POST",
      url: `/tasks/${task.id}/start`,
      headers,
      payload: {}
    });
    assert.equal(session.statusCode, 201);
    const startedSession = session.json<{ id: string }>();

    const paused = await server.app.inject({
      method: "POST",
      url: `/sessions/${startedSession.id}/pause`,
      headers,
      payload: {}
    });
    assert.equal(paused.statusCode, 200);

    const threadResp = await server.app.inject({
      method: "POST",
      url: "/threads",
      headers,
      payload: { targetItemId: intakeBody.itemId, kind: "item_comment" }
    });
    assert.equal(threadResp.statusCode, 201);
    const thread = threadResp.json<{ id: string }>();

    const messageResp = await server.app.inject({
      method: "POST",
      url: "/messages",
      headers,
      payload: {
        threadId: thread.id,
        role: "user",
        content: "Still blocked waiting on production metrics dashboard."
      }
    });
    assert.equal(messageResp.statusCode, 201);

    const nextStep = await server.app.inject({
      method: "POST",
      url: "/functions/what-should-i-do-next",
      headers,
      payload: { itemIds: [intakeBody.itemId] }
    });
    assert.equal(nextStep.statusCode, 201);
    const body = nextStep.json<{ suggestedNextAction: string; reason: string }>();
    assert.match(body.reason, /(recently touched|theme|momentum|blocker)/i);
    assert.ok(body.suggestedNextAction.length > 0);
  } finally {
    await server.app.close();
  }
});
