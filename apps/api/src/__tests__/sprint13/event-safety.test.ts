import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { createServer } from "../../server";

const founderReviewUserId = "11111111-1111-1111-1111-111111111111";
const server = createServer();
const { app, state } = server;

type StoredEvent = Awaited<ReturnType<typeof state.repo.listEventsByUser>>[number];

test.after(async () => {
  await app.close();
});

test("GET /events stays blocked from public access", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/events",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 403);
  const body = response.json<{ message: string }>();
  assert.match(body.message, /disabled/i);
});

test("founder diagnostics response excludes raw event payloads", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review/diagnostics?window=7d",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<Record<string, unknown>>();
  assert.equal("events" in body, false);
  assert.ok(Array.isArray(body.focusItems));
  assert.ok(Array.isArray(body.focusActions));
  assert.ok((body.focusItems as Array<Record<string, unknown>>).every((entry) => !("payload" in entry)));
  assert.ok((body.focusActions as Array<Record<string, unknown>>).every((entry) => !("payload" in entry)));
});

test("founder review analytics ignore spoofed query userId and remain derived-only", async () => {
  const ownerId = founderReviewUserId;
  const spoofedQueryUserId = "99999999-9999-4999-8999-999999999999";
  const headers = { "x-yurbrain-user-id": ownerId };

  const baselineReviewResponse = await app.inject({
    method: "GET",
    url: "/functions/founder-review?window=7d",
    headers
  });
  assert.equal(baselineReviewResponse.statusCode, 200);
  const baselineReview = baselineReviewResponse.json<Record<string, unknown>>();

  const spoofedReviewResponse = await app.inject({
    method: "GET",
    url: `/functions/founder-review?window=7d&userId=${spoofedQueryUserId}`,
    headers
  });
  assert.equal(spoofedReviewResponse.statusCode, 200);
  const spoofedReview = spoofedReviewResponse.json<Record<string, unknown>>();
  assert.equal(spoofedReview.window, baselineReview.window);
  assert.equal("events" in spoofedReview, false);
  assert.equal("rawEvents" in spoofedReview, false);

  const baselineDiagnosticsResponse = await app.inject({
    method: "GET",
    url: "/functions/founder-review/diagnostics?window=7d",
    headers
  });
  assert.equal(baselineDiagnosticsResponse.statusCode, 200);
  const baselineDiagnostics = baselineDiagnosticsResponse.json<Record<string, unknown>>();

  const spoofedDiagnosticsResponse = await app.inject({
    method: "GET",
    url: `/functions/founder-review/diagnostics?window=7d&userId=${spoofedQueryUserId}`,
    headers
  });
  assert.equal(spoofedDiagnosticsResponse.statusCode, 200);
  const spoofedDiagnostics = spoofedDiagnosticsResponse.json<Record<string, unknown>>();

  assert.deepEqual(spoofedDiagnostics.summary, baselineDiagnostics.summary);
  assert.equal("events" in spoofedDiagnostics, false);
  assert.equal("rawEvents" in spoofedDiagnostics, false);
  assert.ok(Array.isArray(spoofedDiagnostics.focusItems));
  assert.ok((spoofedDiagnostics.focusItems as Array<Record<string, unknown>>).every((entry) => !("payload" in entry)));
});

test("capture and update write only allowlisted event payload fields", async () => {
  const createResponse = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers: { "x-yurbrain-user-id": founderReviewUserId },
    payload: {
      content: "N11 event safety seeded capture"
    }
  });
  assert.equal(createResponse.statusCode, 201);
  const createdBody = createResponse.json<{ itemId: string }>();
  assert.ok(createdBody.itemId);

  const updateResponse = await app.inject({
    method: "PATCH",
    url: `/brain-items/${createdBody.itemId}`,
    headers: { "x-yurbrain-user-id": founderReviewUserId },
    payload: {
      title: "N11 updated title",
      status: "archived"
    }
  });
  assert.equal(updateResponse.statusCode, 200);

  const events = await state.repo.listEventsByUser(founderReviewUserId);
  const createdEvent = events.find(
    (event: StoredEvent) =>
      event.eventType === "brain_item_created" && event.payload.id === createdBody.itemId
  );
  const updatedEvent = events.find(
    (event: StoredEvent) =>
      event.eventType === "brain_item_updated" && event.payload.id === createdBody.itemId
  );

  assert.ok(createdEvent);
  assert.deepEqual(
    Object.keys(createdEvent!.payload).sort(),
    ["contentType", "id", "topicGuess", "type"].sort()
  );
  assert.ok(updatedEvent);
  assert.deepEqual(Object.keys(updatedEvent!.payload).sort(), ["changedCategories", "id"]);
  assert.ok(Array.isArray(updatedEvent!.payload.changedCategories));
});

test("event writes are owner-scoped to authenticated user identity", async () => {
  const attackerId = "22222222-2222-2222-2222-222222222222";
  const victimId = founderReviewUserId;
  const itemId = randomUUID();
  const now = new Date().toISOString();

  await state.repo.createBrainItem({
    id: itemId,
    userId: victimId,
    type: "note",
    contentType: "text",
    title: "Victim item",
    rawContent: "private item",
    status: "active",
    createdAt: now,
    updatedAt: now
  });

  const response = await app.inject({
    method: "PATCH",
    url: `/brain-items/${itemId}`,
    headers: { "x-yurbrain-user-id": attackerId },
    payload: {
      title: "malicious change"
    }
  });

  assert.equal(response.statusCode, 404);
  const attackerEvents = await state.repo.listEventsByUser(attackerId);
  const victimEvents = await state.repo.listEventsByUser(victimId);
  const touchedVictimByAttacker = attackerEvents.some(
    (event: StoredEvent) => event.payload.id === itemId
  );
  const touchedVictimByVictim = victimEvents.some(
    (event: StoredEvent) =>
      event.payload.id === itemId && event.eventType === "brain_item_updated"
  );
  assert.equal(touchedVictimByAttacker, false);
  assert.equal(touchedVictimByVictim, false);
});

test("capture route rejects caller-supplied body.userId before event writes", async () => {
  const headerUserId = "33333333-3333-4333-8333-333333333333";
  const spoofedBodyUserId = "44444444-4444-4444-8444-444444444444";

  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers: { "x-yurbrain-user-id": headerUserId },
    payload: {
      userId: spoofedBodyUserId,
      content: "N11 body spoof capture"
    }
  });

  assert.equal(response.statusCode, 400);

  const ownerEvents = await state.repo.listEventsByUser(headerUserId);
  const spoofedEvents = await state.repo.listEventsByUser(spoofedBodyUserId);
  assert.equal(ownerEvents.some((event: StoredEvent) => event.payload.id === undefined), false);
  assert.equal(spoofedEvents.length, 0);
});

test("brain-items create route rejects caller-supplied body.userId before event writes", async () => {
  const headerUserId = "55555555-5555-4555-8555-555555555555";
  const spoofedBodyUserId = "66666666-6666-4666-8666-666666666666";

  const response = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: { "x-yurbrain-user-id": headerUserId },
    payload: {
      userId: spoofedBodyUserId,
      type: "note",
      title: "N11 spoof attempt",
      rawContent: "body user id should be ignored"
    }
  });

  assert.equal(response.statusCode, 400);

  const ownerEvents = await state.repo.listEventsByUser(headerUserId);
  const spoofedEvents = await state.repo.listEventsByUser(spoofedBodyUserId);
  assert.equal(ownerEvents.some((event: StoredEvent) => event.payload.id === undefined), false);
  assert.equal(spoofedEvents.length, 0);
});
