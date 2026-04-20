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
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(summarize.statusCode, 201);

  const classify = await app.inject({
    method: "POST",
    url: "/ai/classify",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(classify.statusCode, 201);

  const allArtifacts = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts`,
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(allArtifacts.statusCode, 200);
  const all = allArtifacts.json<Array<{ id: string; type: string }>>();
  assert.ok(all.length >= 2);
  assert.ok(all.some((artifact) => artifact.type === "summary"));
  assert.ok(all.some((artifact) => artifact.type === "classification"));

  const summaryOnly = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts?type=summary`,
    headers: { "x-yurbrain-user-id": userId }
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
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      title: "Session retrieval check"
    }
  });
  assert.equal(createTask.statusCode, 201);
  const task = createTask.json<{ id: string }>();

  const start = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    headers: { "x-yurbrain-user-id": userId },
    payload: {}
  });
  assert.equal(start.statusCode, 201);
  const session = start.json<{ id: string; taskId: string; state: string }>();

  const byTask = await app.inject({
    method: "GET",
    url: `/sessions?taskId=${task.id}`,
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(byTask.statusCode, 200);
  const taskSessions = byTask.json<Array<{ id: string; taskId: string }>>();
  assert.ok(taskSessions.some((entry) => entry.id === session.id && entry.taskId === task.id));

  const byUser = await app.inject({
    method: "GET",
    url: `/sessions?userId=${userId}`,
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(byUser.statusCode, 200);
  const userSessions = byUser.json<Array<{ id: string }>>();
  assert.ok(userSessions.some((entry) => entry.id === session.id));
});

test("preferences routes persist personalization preferences", async () => {
  const userId = "68686868-6868-4686-8686-686868686868";
  const initial = await app.inject({
    method: "GET",
    url: `/preferences/${userId}`
  });
  assert.equal(initial.statusCode, 200);
  const initialBody = initial.json<{
    founderMode: boolean;
    defaultLens: string;
    renderMode: string;
    aiSummaryMode: string;
    feedDensity: string;
    resurfacingIntensity: string;
  }>();
  assert.equal(initialBody.founderMode, false);
  assert.equal(initialBody.renderMode, "focus");
  assert.equal(initialBody.aiSummaryMode, "balanced");
  assert.equal(initialBody.feedDensity, "comfortable");
  assert.equal(initialBody.resurfacingIntensity, "balanced");

  const updated = await app.inject({
    method: "PUT",
    url: `/preferences/${userId}`,
    payload: {
      defaultLens: "open_loops",
      founderMode: true,
      renderMode: "explore",
      aiSummaryMode: "concise",
      feedDensity: "compact",
      resurfacingIntensity: "active"
    }
  });
  assert.equal(updated.statusCode, 200);
  const updatedBody = updated.json<{
    founderMode: boolean;
    defaultLens: string;
    renderMode: string;
    aiSummaryMode: string;
    feedDensity: string;
    resurfacingIntensity: string;
  }>();
  assert.equal(updatedBody.defaultLens, "open_loops");
  assert.equal(updatedBody.founderMode, true);
  assert.equal(updatedBody.renderMode, "explore");
  assert.equal(updatedBody.aiSummaryMode, "concise");
  assert.equal(updatedBody.feedDensity, "compact");
  assert.equal(updatedBody.resurfacingIntensity, "active");

  const persisted = await app.inject({
    method: "GET",
    url: `/preferences/${userId}`
  });
  assert.equal(persisted.statusCode, 200);
  const body = persisted.json<{
    founderMode: boolean;
    defaultLens: string;
    renderMode: string;
    aiSummaryMode: string;
    feedDensity: string;
    resurfacingIntensity: string;
  }>();
  assert.equal(body.defaultLens, "open_loops");
  assert.equal(body.founderMode, true);
  assert.equal(body.renderMode, "explore");
  assert.equal(body.aiSummaryMode, "concise");
  assert.equal(body.feedDensity, "compact");
  assert.equal(body.resurfacingIntensity, "active");
});

test("GET /events/me returns only authenticated user's events and supports filtering", async () => {
  const userId = "69696969-6969-4696-8696-696969696969";
  const otherUserId = "79797979-7979-4797-8797-797979797979";

  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": userId },
    payload: {
      type: "note",
      title: "Event scope target",
      rawContent: "Primary user event source"
    }
  });
  assert.equal(created.statusCode, 201);

  const otherCreated = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": otherUserId },
    payload: {
      type: "note",
      title: "Other user event source",
      rawContent: "Should not leak"
    }
  });
  assert.equal(otherCreated.statusCode, 201);

  const listed = await app.inject({
    method: "GET",
    url: "/events/me",
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(listed.statusCode, 200);
  const events = listed.json<Array<{ userId: string; eventType: string }>>();
  assert.ok(events.length >= 1);
  assert.ok(events.every((event) => event.userId === userId));
  assert.ok(events.some((event) => event.eventType === "brain_item_created"));

  const filtered = await app.inject({
    method: "GET",
    url: "/events/me?eventType=brain_item_updated",
    headers: { "x-yurbrain-user-id": userId }
  });
  assert.equal(filtered.statusCode, 200);
  const updatedOnly = filtered.json<Array<{ eventType: string }>>();
  assert.ok(updatedOnly.every((event) => event.eventType === "brain_item_updated"));
});

test("GET /events remains blocked while raw event exposure is unsafe", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/events"
  });
  assert.equal(response.statusCode, 403);
});
