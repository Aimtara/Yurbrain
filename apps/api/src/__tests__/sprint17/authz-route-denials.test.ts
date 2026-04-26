import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";
import type { LightMyRequestResponse } from "fastify";
import { createTestJwt } from "../helpers/auth-token";

process.env.NODE_ENV = "test";
process.env.YURBRAIN_TEST_MODE = "1";

async function strictHeaders(userId: string) {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

test("feed, thread, message, task, session, explore, and AI alias routes deny cross-user access", async () => {
  const dbPath = createDbPath("authz-route-denials");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });
  const userA = "a1111111-1111-4111-8111-111111111111";
  const userB = "b2222222-2222-4222-8222-222222222222";
  const userAHeaders = await strictHeaders(userA);
  const userBHeaders = await strictHeaders(userB);

  try {
    const created = await app.inject({
      method: "POST",
      url: "/brain-items",
      headers: userAHeaders,
      payload: {
        type: "note",
        title: "Private authz sweep item",
        rawContent: "Only user A should be able to continue this thread."
      }
    });
    assert.equal(created.statusCode, 201);
    const item = created.json<{ id: string; rawContent: string }>();

    const ownerFeed = await app.inject({ method: "GET", url: "/feed?lens=all&limit=5", headers: userAHeaders });
    assert.equal(ownerFeed.statusCode, 200);
    const card = ownerFeed.json<Array<{ id: string; itemId: string | null }>>().find((entry) => entry.itemId === item.id);
    assert.ok(card?.id);

    for (const action of ["dismiss", "snooze", "remind-later", "refresh"] as const) {
      const blockedFeedActionResponse: LightMyRequestResponse = await app.inject({
        method: "POST",
        url: `/feed/${card.id}/${action}`,
        headers: userBHeaders,
        payload: action === "snooze" || action === "remind-later" ? { minutes: 30 } : {}
      });
      assert.equal(blockedFeedActionResponse.statusCode, 404, `expected /feed ${action} to deny cross-user access`);
    }

    for (const action of ["dismiss", "snooze", "refresh"] as const) {
      const blockedFunctionFeedActionResponse: LightMyRequestResponse = await app.inject({
        method: "POST",
        url: `/functions/feed/${card.id}/${action}`,
        headers: userBHeaders,
        payload: action === "snooze" ? { minutes: 30 } : {}
      });
      assert.equal(blockedFunctionFeedActionResponse.statusCode, 404, `expected /functions/feed ${action} to deny cross-user access`);
    }

    const outsiderCreateThread = await app.inject({
      method: "POST",
      url: "/threads",
      headers: userBHeaders,
      payload: { targetItemId: item.id, kind: "item_comment" }
    });
    assert.equal(outsiderCreateThread.statusCode, 404);

    const ownerThread = await app.inject({
      method: "POST",
      url: "/threads",
      headers: userAHeaders,
      payload: { targetItemId: item.id, kind: "item_comment" }
    });
    assert.equal(ownerThread.statusCode, 201);
    const thread = ownerThread.json<{ id: string }>();

    const outsiderReadThread = await app.inject({
      method: "GET",
      url: `/threads/${thread.id}`,
      headers: userBHeaders
    });
    assert.equal(outsiderReadThread.statusCode, 404);

    const outsiderListByTarget = await app.inject({
      method: "GET",
      url: `/threads/by-target?targetItemId=${item.id}`,
      headers: userBHeaders
    });
    assert.equal(outsiderListByTarget.statusCode, 200);
    assert.deepEqual(outsiderListByTarget.json<unknown[]>(), []);

    const outsiderPostMessage = await app.inject({
      method: "POST",
      url: "/messages",
      headers: userBHeaders,
      payload: { threadId: thread.id, role: "user", content: "Cross-user comment attempt" }
    });
    assert.equal(outsiderPostMessage.statusCode, 404);

    const ownerMessage = await app.inject({
      method: "POST",
      url: "/messages",
      headers: userAHeaders,
      payload: { threadId: thread.id, role: "user", content: "Owner comment" }
    });
    assert.equal(ownerMessage.statusCode, 201);

    const outsiderListMessages = await app.inject({
      method: "GET",
      url: `/threads/${thread.id}/messages`,
      headers: userBHeaders
    });
    assert.equal(outsiderListMessages.statusCode, 404);

    const ownerTask = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: userAHeaders,
      payload: { title: "Owner-only task", sourceItemId: item.id }
    });
    assert.equal(ownerTask.statusCode, 201);
    const task = ownerTask.json<{ id: string }>();

    const outsiderPatchTask = await app.inject({
      method: "PATCH",
      url: `/tasks/${task.id}`,
      headers: userBHeaders,
      payload: { title: "Attacker update" }
    });
    assert.equal(outsiderPatchTask.statusCode, 404);

    const outsiderStartTask = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/start`,
      headers: userBHeaders,
      payload: {}
    });
    assert.equal(outsiderStartTask.statusCode, 404);

    const ownerStart = await app.inject({
      method: "POST",
      url: `/tasks/${task.id}/start`,
      headers: userAHeaders,
      payload: {}
    });
    assert.equal(ownerStart.statusCode, 201);
    const session = ownerStart.json<{ id: string }>();

    const outsiderPauseSession = await app.inject({
      method: "POST",
      url: `/sessions/${session.id}/pause`,
      headers: userBHeaders,
      payload: {}
    });
    assert.equal(outsiderPauseSession.statusCode, 404);

    const outsiderFinishSession = await app.inject({
      method: "POST",
      url: `/sessions/${session.id}/finish`,
      headers: userBHeaders,
      payload: {}
    });
    assert.equal(outsiderFinishSession.statusCode, 404);

    const outsiderAiAlias = await app.inject({
      method: "POST",
      url: `/ai/brain-items/${item.id}/summarize`,
      headers: userBHeaders,
      payload: { rawContent: item.rawContent }
    });
    assert.equal(outsiderAiAlias.statusCode, 404);

    const outsiderConvertAlias = await app.inject({
      method: "POST",
      url: "/ai/convert",
      headers: userBHeaders,
      payload: { sourceItemId: item.id, content: item.rawContent }
    });
    assert.equal(outsiderConvertAlias.statusCode, 404);

    const second = await app.inject({
      method: "POST",
      url: "/brain-items",
      headers: userAHeaders,
      payload: {
        type: "note",
        title: "Second private authz item",
        rawContent: "A second owner-only item for Explore."
      }
    });
    assert.equal(second.statusCode, 201);
    const secondItem = second.json<{ id: string }>();

    const outsiderExplorePreview = await app.inject({
      method: "POST",
      url: "/explore/connections/preview",
      headers: userBHeaders,
      payload: { sourceItemIds: [item.id, secondItem.id], mode: "idea" }
    });
    assert.equal(outsiderExplorePreview.statusCode, 404);

    const ownerPreview = await app.inject({
      method: "POST",
      url: "/explore/connections/preview",
      headers: userAHeaders,
      payload: { sourceItemIds: [item.id, secondItem.id], mode: "idea" }
    });
    assert.equal(ownerPreview.statusCode, 200);
    const candidate = ownerPreview.json<{ candidates: Array<Record<string, unknown>> }>().candidates[0];
    assert.ok(candidate);

    const outsiderExploreSave = await app.inject({
      method: "POST",
      url: "/explore/connections/save",
      headers: userBHeaders,
      payload: { sourceItemIds: [item.id, secondItem.id], mode: "idea", candidate }
    });
    assert.equal(outsiderExploreSave.statusCode, 404);

    const events = await app.inject({ method: "GET", url: "/events", headers: userAHeaders });
    assert.equal(events.statusCode, 403);
  } finally {
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
