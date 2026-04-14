import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("GET /brain-items/:id/artifacts returns persisted AI artifacts", async () => {
  const userId = "66666666-6666-4666-8666-666666666666";
  const createItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Artifact persistence check",
      rawContent: "Ensure summary and classification artifacts can be fetched later."
    }
  });
  assert.equal(createItem.statusCode, 201);
  const item = createItem.json<{ id: string; rawContent: string }>();

  const summarize = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(summarize.statusCode, 201);

  const classify = await app.inject({
    method: "POST",
    url: "/ai/classify",
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(classify.statusCode, 201);

  const allArtifacts = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts`
  });
  assert.equal(allArtifacts.statusCode, 200);
  const all = allArtifacts.json<Array<{ id: string; type: string }>>();
  assert.ok(all.length >= 2);
  assert.ok(all.some((artifact) => artifact.type === "summary"));
  assert.ok(all.some((artifact) => artifact.type === "classification"));

  const summaryOnly = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts?type=summary`
  });
  assert.equal(summaryOnly.statusCode, 200);
  const summaries = summaryOnly.json<Array<{ type: string }>>();
  assert.ok(summaries.length >= 1);
  assert.ok(summaries.every((artifact) => artifact.type === "summary"));
});

test("GET /sessions supports task and user filters", async () => {
  const userId = "67676767-6767-4676-8676-676767676767";
  const createTask = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Session retrieval check"
    }
  });
  assert.equal(createTask.statusCode, 201);
  const task = createTask.json<{ id: string }>();

  const start = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(start.statusCode, 201);
  const session = start.json<{ id: string; taskId: string; state: string }>();

  const byTask = await app.inject({
    method: "GET",
    url: `/sessions?taskId=${task.id}`
  });
  assert.equal(byTask.statusCode, 200);
  const taskSessions = byTask.json<Array<{ id: string; taskId: string }>>();
  assert.ok(taskSessions.some((entry) => entry.id === session.id && entry.taskId === task.id));

  const byUser = await app.inject({
    method: "GET",
    url: `/sessions?userId=${userId}`
  });
  assert.equal(byUser.statusCode, 200);
  const userSessions = byUser.json<Array<{ id: string }>>();
  assert.ok(userSessions.some((entry) => entry.id === session.id));
});
