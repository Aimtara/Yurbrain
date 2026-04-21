import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("GET /functions/feed and /functions/feed/rank return the same ranked cards", async () => {
  const userId = "14141414-1414-4414-8414-141414141414";
  const captures = [
    "Draft migration review notes with continuity checkpoints.",
    "Follow up on function routing alignment for feed and founder review.",
    "Collect ranking evidence for whyShown quality in function mode."
  ];

  for (const content of captures) {
    const response = await app.inject({
      method: "POST",
      url: "/capture/intake",
      payload: {
        userId,
        type: "text",
        content,
        topicGuess: "Nhost migration"
      }
    });
    assert.equal(response.statusCode, 201);
  }

  const direct = await app.inject({
    method: "GET",
    url: "/functions/feed?lens=all&limit=2",
    headers: { "x-yurbrain-user-id": userId }
  });
  const alias = await app.inject({
    method: "GET",
    url: "/functions/feed/rank?lens=all&limit=2",
    headers: { "x-yurbrain-user-id": userId }
  });

  assert.equal(direct.statusCode, 200);
  assert.equal(alias.statusCode, 200);
  const directCards = direct.json<Array<{ id: string; whyShown: { summary: string }; availableActions: string[] }>>();
  const aliasCards = alias.json<Array<{ id: string }>>();
  assert.ok(directCards.length >= 1);
  assert.ok(directCards.length <= 2);
  assert.deepEqual(
    directCards.map((card) => card.id),
    aliasCards.map((card) => card.id)
  );
  assert.ok(directCards.every((card) => card.whyShown.summary.length > 0));
  assert.ok(directCards.every((card) => card.availableActions.includes("dismiss")));
});

test("feed function actions require owner identity and preserve behavior", async () => {
  const userId = "15151515-1515-4515-8515-151515151515";
  const createResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Function action target card",
      body: "Card used to validate feed function actions."
    }
  });
  assert.equal(createResp.statusCode, 201);
  const cardId = createResp.json<{ id: string }>().id;

  const snooze = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/snooze`,
    headers: { "x-yurbrain-user-id": userId },
    payload: { minutes: 45 }
  });
  assert.equal(snooze.statusCode, 200);

  const refresh = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/refresh`,
    headers: { "x-yurbrain-user-id": userId },
    payload: {}
  });
  assert.equal(refresh.statusCode, 200);

  const dismiss = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/dismiss`,
    headers: { "x-yurbrain-user-id": userId },
    payload: {}
  });
  assert.equal(dismiss.statusCode, 200);

  const unauthorizedRefresh = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/refresh`,
    headers: { "x-yurbrain-user-id": "16161616-1616-4616-8616-161616161616" },
    payload: {}
  });
  assert.equal(unauthorizedRefresh.statusCode, 404);
});

test("next-step function route alias matches canonical route response", async () => {
  const userId = "17171717-1717-4717-8717-171717171717";
  const captures = await Promise.all(
    [
      "Prepare one concrete next action for migration docs.",
      "Close open transport mismatches safely.",
      "Verify founder readout remains actionable."
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
  captures.forEach((response) => assert.equal(response.statusCode, 201));
  const itemIds = captures.map((response) => response.json<{ itemId: string }>().itemId);

  const canonical = await app.inject({
    method: "POST",
    url: "/functions/what-should-i-do-next",
    headers: { "x-yurbrain-user-id": userId },
    payload: { itemIds }
  });
  const alias = await app.inject({
    method: "POST",
    url: "/functions/next-step",
    headers: { "x-yurbrain-user-id": userId },
    payload: { itemIds }
  });

  assert.equal(canonical.statusCode, 201);
  assert.equal(alias.statusCode, 201);
  assert.deepEqual(
    alias.json<{ suggestedNextAction: string; reason: string }>(),
    canonical.json<{ suggestedNextAction: string; reason: string }>()
  );
});

test("summarize-progress returns 404 for non-owner item access", async () => {
  const ownerId = "18111111-1811-4811-8811-181111111111";
  const outsiderId = "19111111-1911-4911-8911-191111111111";
  const created = await app.inject({
    method: "POST",
    url: "/capture/intake",
    payload: {
      userId: ownerId,
      type: "text",
      content: "Owner-only synthesis item."
    }
  });
  assert.equal(created.statusCode, 201);
  const itemId = created.json<{ itemId: string }>().itemId;

  const response = await app.inject({
    method: "POST",
    url: "/functions/summarize-progress",
    headers: { "x-yurbrain-user-id": outsiderId },
    payload: { itemIds: [itemId] }
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json<{ message: string }>().message, "Brain item not found");
});

test("function thin-slice summarize/classify/query/convert routes preserve deterministic behavior", async () => {
  const userId = "20202020-2020-4020-8020-202020202020";
  const headers = { "x-yurbrain-user-id": userId };

  const itemResponse = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers,
    payload: {
      type: "note",
      title: "Function thin-slice target",
      rawContent: "Summarize this continuity context for a concrete next action."
    }
  });
  assert.equal(itemResponse.statusCode, 201);
  const item = itemResponse.json<{ id: string; rawContent: string }>();

  const summarizeResponse = await app.inject({
    method: "POST",
    url: "/functions/summarize",
    headers,
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(summarizeResponse.statusCode, 201);
  const summarizeBody = summarizeResponse.json<{ type: string; fallbackUsed: boolean; ai: { content: string } }>();
  assert.equal(summarizeBody.type, "summary");
  assert.match(summarizeBody.ai.content, /Changed:/);
  assert.equal(summarizeBody.fallbackUsed, false);

  const classifyResponse = await app.inject({
    method: "POST",
    url: "/functions/classify",
    headers,
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(classifyResponse.statusCode, 201);
  const classifyBody = classifyResponse.json<{ type: string; ai: { content: string } }>();
  assert.equal(classifyBody.type, "classification");
  assert.match(classifyBody.ai.content, /CLASSIFY:/);

  const threadResponse = await app.inject({
    method: "POST",
    url: "/threads",
    headers,
    payload: {
      targetItemId: item.id,
      kind: "item_chat"
    }
  });
  assert.equal(threadResponse.statusCode, 201);
  const threadId = threadResponse.json<{ id: string }>().id;

  const queryResponse = await app.inject({
    method: "POST",
    url: "/functions/query",
    headers,
    payload: {
      threadId,
      question: "[force-timeout] what should I do next?",
      timeoutMs: 200
    }
  });
  assert.equal(queryResponse.statusCode, 201);
  const queryBody = queryResponse.json<{ fallbackUsed: boolean; fallbackReason?: string; message: { content: string } }>();
  assert.equal(queryBody.fallbackUsed, true);
  assert.equal(queryBody.fallbackReason, "timeout");
  assert.match(queryBody.message.content, /Recommendation:/);

  const convertNotRecommended = await app.inject({
    method: "POST",
    url: "/functions/convert",
    headers,
    payload: {
      sourceItemId: item.id,
      content: "Too short"
    }
  });
  assert.equal(convertNotRecommended.statusCode, 201);
  assert.equal(convertNotRecommended.json<{ outcome: string }>().outcome, "not_recommended");

  const convertTask = await app.inject({
    method: "POST",
    url: "/functions/convert",
    headers,
    payload: {
      sourceItemId: item.id,
      content: "Ship production migration checklist updates and verify loop parity."
    }
  });
  assert.equal(convertTask.statusCode, 201);
  const convertTaskBody = convertTask.json<{ outcome: string; task?: { userId: string } }>();
  assert.equal(convertTaskBody.outcome, "task_created");
  assert.equal(convertTaskBody.task?.userId, userId);
});
