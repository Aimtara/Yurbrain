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
  const body = resp.json<
    Array<{
      id: string;
      whyShown: { summary: string; reasons: string[] };
      availableActions: string[];
      stateFlags: { dismissed: boolean; snoozed: boolean };
    }>
  >();
  assert.equal(body.length, 2);
  assert.ok(body.every((card) => card.whyShown.summary.length > 0));
  assert.ok(body.every((card) => card.whyShown.reasons.length >= 1));
  assert.ok(body.every((card) => card.availableActions.includes("dismiss")));
  assert.ok(body.every((card) => typeof card.stateFlags.snoozed === "boolean"));
  assert.ok(body.every((card) => (card as { relatedCount?: number | null }).relatedCount === null || typeof (card as { relatedCount?: number | null }).relatedCount === "number"));
  assert.ok(body.every((card) => typeof (card as { lastTouched?: string | null }).lastTouched !== "undefined"));

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

  const includeSnoozedResp = await app.inject({
    method: "GET",
    url: "/feed?userId=33333333-3333-3333-3333-333333333333&includeSnoozed=true"
  });
  assert.equal(includeSnoozedResp.statusCode, 200);
  const includeSnoozedCards = includeSnoozedResp.json<Array<{ id: string; postponeCount: number; lastPostponedAt: string | null }>>();
  assert.equal(includeSnoozedCards.some((feedCard) => feedCard.id === card.id), true);
  const snoozedCard = includeSnoozedCards.find((feedCard) => feedCard.id === card.id);
  assert.ok(snoozedCard);
  assert.equal(snoozedCard.postponeCount, 1);
  assert.ok(typeof snoozedCard.lastPostponedAt === "string");
});

test("ranking de-prioritizes repeatedly postponed cards when included", async () => {
  const userId = "77777777-7777-4777-8777-777777777777";

  const stableResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Stable card",
      body: "Should stay easier to pick than repeatedly postponed card."
    }
  });
  assert.equal(stableResp.statusCode, 201);
  const stableCard = stableResp.json<{ id: string }>();

  const postponedResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Postponed card",
      body: "Will be postponed a few times."
    }
  });
  assert.equal(postponedResp.statusCode, 201);
  const postponedCard = postponedResp.json<{ id: string }>();

  for (let index = 0; index < 3; index += 1) {
    const snoozeResp = await app.inject({
      method: "POST",
      url: `/feed/${postponedCard.id}/snooze`,
      payload: { minutes: 120 }
    });
    assert.equal(snoozeResp.statusCode, 200);
  }

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&includeSnoozed=true&limit=2`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string; postponeCount: number }>>();
  assert.equal(cards[0]?.id, stableCard.id);
  const postponedEntry = cards.find((card) => card.id === postponedCard.id);
  assert.ok(postponedEntry);
  assert.ok((postponedEntry?.postponeCount ?? 0) >= 3);
});

test("dismissed cards stay hidden and cannot be snoozed", async () => {
  const userId = "44444444-4444-4444-4444-444444444444";
  const createResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Dismiss me",
      body: "Card should not surface after dismissal"
    }
  });

  assert.equal(createResp.statusCode, 201);
  const card = createResp.json<{ id: string }>();

  const dismissResp = await app.inject({
    method: "POST",
    url: `/feed/${card.id}/dismiss`
  });
  assert.equal(dismissResp.statusCode, 200);
  assert.equal(dismissResp.json<{ dismissed: boolean }>().dismissed, true);

  const snoozeDismissedResp = await app.inject({
    method: "POST",
    url: `/feed/${card.id}/snooze`,
    payload: { minutes: 120 }
  });
  assert.equal(snoozeDismissedResp.statusCode, 409);

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string }>>();
  assert.equal(cards.some((feedCard) => feedCard.id === card.id), false);
});

test("ranking lowers noisy over-refreshed cards", async () => {
  const userId = "55555555-5555-4555-8555-555555555555";
  const calmResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Calm card",
      body: "Stable signal should remain visible"
    }
  });
  assert.equal(calmResp.statusCode, 201);
  const calmCard = calmResp.json<{ id: string }>();

  const noisyResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Noisy card",
      body: "Repeated refreshes should reduce ranking weight"
    }
  });
  assert.equal(noisyResp.statusCode, 201);
  const noisyCard = noisyResp.json<{ id: string }>();

  for (let index = 0; index < 4; index += 1) {
    const refreshResp = await app.inject({
      method: "POST",
      url: `/feed/${noisyCard.id}/refresh`
    });
    assert.equal(refreshResp.statusCode, 200);
  }

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&limit=2`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string }>>();
  assert.equal(cards[0]?.id, calmCard.id);
});

test("ranking preserves continuity for recently revisited cards without adding noise", async () => {
  const userId = "66666666-6666-4666-8666-666666666666";
  const earlierResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Earlier card",
      body: "Should stay visible when recently revisited"
    }
  });
  assert.equal(earlierResp.statusCode, 201);
  const earlierCard = earlierResp.json<{ id: string }>();

  const laterResp = await app.inject({
    method: "POST",
    url: "/ai/feed/generate-card",
    payload: {
      userId,
      title: "Later card",
      body: "New but not revisited yet"
    }
  });
  assert.equal(laterResp.statusCode, 201);
  const laterCard = laterResp.json<{ id: string }>();

  const refreshResp = await app.inject({
    method: "POST",
    url: `/feed/${earlierCard.id}/refresh`
  });
  assert.equal(refreshResp.statusCode, 200);

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&limit=2`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string; whyShown: { reasons: string[] } }>>();

  assert.equal(cards[0]?.id, earlierCard.id);
  assert.ok(
    cards[0]?.whyShown.reasons.some((reason) => {
      const normalized = reason.toLowerCase();
      return normalized.includes("revisited") || normalized.includes("continuity");
    })
  );
  assert.equal(cards.some((card) => card.id === laterCard.id), true);
});
