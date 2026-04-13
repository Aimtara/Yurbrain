import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test("POST /ai/convert returns not_recommended for very short content", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/ai/convert",
    payload: {
      userId: "11111111-1111-1111-1111-111111111111",
      content: "ok"
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{ outcome: string; reason?: string }>();
  assert.equal(body.outcome, "not_recommended");
  assert.ok(body.reason);
});

test("POST /ai/convert creates task and preserves source linkage", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/ai/convert",
    payload: {
      userId: "22222222-2222-2222-2222-222222222222",
      sourceItemId: "33333333-3333-3333-3333-333333333333",
      sourceMessageId: "44444444-4444-4444-4444-444444444444",
      content: "Follow up with product design about task conversion flows"
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    outcome: string;
    task?: { id: string; sourceItemId: string | null; sourceMessageId: string | null; status: string };
  }>();

  assert.equal(body.outcome, "create_task");
  assert.equal(body.task?.sourceItemId, "33333333-3333-3333-3333-333333333333");
  assert.equal(body.task?.sourceMessageId, "44444444-4444-4444-4444-444444444444");
  assert.equal(body.task?.status, "todo");
});

test("session lifecycle start -> pause -> finish updates task status", async () => {
  const taskCreate = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId: "55555555-5555-5555-5555-555555555555",
      title: "Prepare release notes"
    }
  });

  assert.equal(taskCreate.statusCode, 201);
  const task = taskCreate.json<{ id: string }>();

  const startResponse = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(startResponse.statusCode, 201);
  const started = startResponse.json<{ id: string; state: string }>();
  assert.equal(started.state, "running");

  const pausedResponse = await app.inject({
    method: "POST",
    url: `/sessions/${started.id}/pause`,
    payload: {}
  });
  assert.equal(pausedResponse.statusCode, 200);
  assert.equal(pausedResponse.json<{ state: string }>().state, "paused");

  const finishedResponse = await app.inject({
    method: "POST",
    url: `/sessions/${started.id}/finish`,
    payload: {}
  });
  assert.equal(finishedResponse.statusCode, 200);
  const finished = finishedResponse.json<{ state: string; endedAt: string | null }>();
  assert.equal(finished.state, "finished");
  assert.ok(finished.endedAt);

  const taskFetch = await app.inject({ method: "GET", url: `/tasks/${task.id}` });
  assert.equal(taskFetch.statusCode, 200);
  assert.equal(taskFetch.json<{ status: string }>().status, "done");
});
