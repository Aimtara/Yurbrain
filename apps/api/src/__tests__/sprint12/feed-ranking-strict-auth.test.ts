import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

function createUnsignedJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.`;
}

function strictHeaders(userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${createUnsignedJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test.after(async () => {
  await app.close();
});

test("feed ranking ergonomics hold under strict auth using function feed actions", async () => {
  const userId = "18181818-1818-4818-8818-181818181818";
  const headers = strictHeaders(userId);

  const stableResp = await app.inject({
    method: "POST",
    url: "/functions/feed/generate-card",
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
    url: "/functions/feed/generate-card",
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
      url: `/functions/feed/${postponedCard.id}/snooze`,
      headers,
      payload: { minutes: 120 }
    });
    assert.equal(snoozeResp.statusCode, 200);
  }

  const feedResp = await app.inject({
    method: "GET",
    url: "/functions/feed?includeSnoozed=true&limit=2",
    headers
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ id: string; postponeCount: number; whyShown: { reasons: string[] } }>>();
  assert.equal(cards[0]?.id, stableCard.id);
  const postponedEntry = cards.find((card) => card.id === postponedCard.id);
  assert.ok(postponedEntry);
  assert.ok((postponedEntry?.postponeCount ?? 0) >= 3);
  assert.ok(cards.every((card) => card.whyShown.reasons.length >= 1));
});

test("function feed canonical route works in strict mode and preserves whyShown quality", async () => {
  const userId = "19191919-1919-4919-8919-191919191919";
  const headers = strictHeaders(userId);

  const capture = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      type: "text",
      content: "Strict mode function feed alias validation capture."
    }
  });
  assert.equal(capture.statusCode, 201);

  const canonical = await app.inject({
    method: "GET",
    url: "/functions/feed?lens=all&limit=1",
    headers
  });
  assert.equal(canonical.statusCode, 200);
  const canonicalCards = canonical.json<Array<{ id: string; whyShown: { summary: string } }>>();
  assert.equal(canonicalCards.length, 1);
  assert.ok((canonicalCards[0]?.whyShown.summary.length ?? 0) > 0);
});
