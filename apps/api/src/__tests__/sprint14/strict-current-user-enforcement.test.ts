import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

test("strict current-user enforcement rejects missing identity and ignores spoofed userId inputs", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `strict-user-enforcement-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "78787878-7878-4787-8787-787878787878";
  const spoofedUserId = "79797979-7979-4797-8797-797979797979";
  const headers = { "x-yurbrain-user-id": userId };

  try {
    const unauthenticatedFeed = await server.app.inject({
      method: "GET",
      url: "/feed"
    });
    assert.equal(unauthenticatedFeed.statusCode, 401);

    const unauthenticatedFounderReview = await server.app.inject({
      method: "GET",
      url: "/functions/founder-review?window=7d"
    });
    assert.equal(unauthenticatedFounderReview.statusCode, 401);

    const createTask = await server.app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: {
        title: "Verify strict identity enforcement"
      }
    });
    assert.equal(createTask.statusCode, 201);
    const task = createTask.json<{ id: string; userId: string }>();
    assert.equal(task.userId, userId);

    const listTasksWithSpoofedQuery = await server.app.inject({
      method: "GET",
      url: `/tasks?userId=${spoofedUserId}`,
      headers
    });
    assert.equal(listTasksWithSpoofedQuery.statusCode, 400);

    const startSession = await server.app.inject({
      method: "POST",
      url: `/tasks/${task.id}/start`,
      headers,
      payload: {}
    });
    assert.equal(startSession.statusCode, 201);
    const session = startSession.json<{ id: string }>();

    const listSessionsWithSpoofedQuery = await server.app.inject({
      method: "GET",
      url: `/sessions?userId=${spoofedUserId}`,
      headers
    });
    assert.equal(listSessionsWithSpoofedQuery.statusCode, 400);

    const readPreferenceWithSpoofedPath = await server.app.inject({
      method: "GET",
      url: `/preferences/${spoofedUserId}`,
      headers
    });
    assert.equal(readPreferenceWithSpoofedPath.statusCode, 200);
    assert.equal(readPreferenceWithSpoofedPath.json<{ userId: string }>().userId, userId);

    const updatePreferenceWithSpoofedPath = await server.app.inject({
      method: "PUT",
      url: `/preferences/${spoofedUserId}`,
      headers,
      payload: { founderMode: true }
    });
    assert.equal(updatePreferenceWithSpoofedPath.statusCode, 200);
    const updatedPreference = updatePreferenceWithSpoofedPath.json<{ userId: string; founderMode: boolean }>();
    assert.equal(updatedPreference.userId, userId);
    assert.equal(updatedPreference.founderMode, true);

    const baselineFounderReview = await server.app.inject({
      method: "GET",
      url: "/functions/founder-review?window=7d",
      headers
    });
    assert.equal(baselineFounderReview.statusCode, 200);
    const spoofedFounderReview = await server.app.inject({
      method: "GET",
      url: `/functions/founder-review?window=7d&userId=${spoofedUserId}`,
      headers
    });
    assert.equal(spoofedFounderReview.statusCode, 200);
    const baselineReview = baselineFounderReview.json<{
      window: string;
      header: { title: string };
      overview: { overallProduct: { score: number } };
    }>();
    const spoofedReview = spoofedFounderReview.json<{
      window: string;
      header: { title: string };
      overview: { overallProduct: { score: number } };
    }>();
    assert.equal(spoofedReview.window, baselineReview.window);
    assert.equal(spoofedReview.header.title, baselineReview.header.title);
    assert.equal(spoofedReview.overview.overallProduct.score, baselineReview.overview.overallProduct.score);

    const baselineDiagnostics = await server.app.inject({
      method: "GET",
      url: "/functions/founder-review/diagnostics?window=7d",
      headers
    });
    assert.equal(baselineDiagnostics.statusCode, 200);
    const spoofedDiagnostics = await server.app.inject({
      method: "GET",
      url: `/functions/founder-review/diagnostics?window=7d&userId=${spoofedUserId}`,
      headers
    });
    assert.equal(spoofedDiagnostics.statusCode, 200);
    const baselineDiagnosticsBody = baselineDiagnostics.json<{
      summary: { itemCount: number; taskCount: number; sessionCount: number };
    }>();
    const spoofedDiagnosticsBody = spoofedDiagnostics.json<{
      summary: { itemCount: number; taskCount: number; sessionCount: number };
    }>();
    assert.deepEqual(spoofedDiagnosticsBody.summary, baselineDiagnosticsBody.summary);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
