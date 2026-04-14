import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("GET /feed applies lens + limit deterministically", async () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  for (const [title, rawContent] of [
    ["Open invoice", "Need to settle invoice this week"],
    ["Book notes", "Captured takeaways from deep work"],
    ["Team follow up", "Check in with design tomorrow"]
  ]) {
    await app.inject({
      method: "POST",
      url: "/brain-items",
      payload: {
        userId,
        type: "note",
        title,
        rawContent
      }
    });
  }

  const resp = await app.inject({ method: "GET", url: `/feed?userId=${userId}&limit=2` });
  assert.equal(resp.statusCode, 200);
  const body = resp.json<Array<{ id: string }>>();
  assert.equal(body.length, 2);

  const respAgain = await app.inject({ method: "GET", url: `/feed?userId=${userId}&limit=2` });
  assert.equal(respAgain.statusCode, 200);
  const bodyAgain = respAgain.json<Array<{ id: string }>>();

  assert.deepEqual(
    body.map((card) => card.id),
    bodyAgain.map((card) => card.id)
  );
});

test("GET /feed excludes snoozed cards by default", async () => {
  const createResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId: "33333333-3333-3333-3333-333333333333",
      title: "Snooze me",
      body: "This should disappear while snoozed"
    }
  });

  assert.equal(createResp.statusCode, 201);
  const card = createResp.json<{ id: string }>();

  const snoozeResp = await app.inject({
    method: "POST",
    url: `/feed/${card.id}/snooze`,
    payload: { minutes: 120 }
  });
  assert.equal(snoozeResp.statusCode, 200);

  const feedResp = await app.inject({
    method: "GET",
    url: "/feed?userId=33333333-3333-3333-3333-333333333333"
  });

  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string }>>();
  assert.equal(cards.some((feedCard) => feedCard.id === card.id), false);
});
