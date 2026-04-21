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
