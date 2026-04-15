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
  const includeSnoozedCards = includeSnoozedResp.json<Array<{ id: string }>>();
  assert.equal(includeSnoozedCards.some((feedCard) => feedCard.id === card.id), true);
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
  assert.ok(cards[0]?.whyShown.reasons.some((reason) => reason.toLowerCase().includes("continuity")));
  assert.equal(cards.some((card) => card.id === laterCard.id), true);
});

test("founder execution lens filters to ready-to-move execution cards", async () => {
  const userId = "77777777-7777-4777-8777-777777777777";
  const plannedItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Planned execution item",
      rawContent: "Needs a short task start"
    }
  });
  assert.equal(plannedItem.statusCode, 201);
  const plannedId = plannedItem.json<{ id: string }>().id;

  const blockedItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Blocked execution item",
      rawContent: "Waiting on upstream input"
    }
  });
  assert.equal(blockedItem.statusCode, 201);
  const blockedId = blockedItem.json<{ id: string }>().id;

  const patchPlanned = await app.inject({
    method: "PATCH",
    url: `/brain-items/${plannedId}`,
    payload: {
      execution: {
        status: "planned",
        nextStep: "Start with one short session."
      }
    }
  });
  assert.equal(patchPlanned.statusCode, 200);

  const patchBlocked = await app.inject({
    method: "PATCH",
    url: `/brain-items/${blockedId}`,
    payload: {
      execution: {
        status: "blocked",
        nextStep: "Capture unblock note."
      }
    }
  });
  assert.equal(patchBlocked.statusCode, 200);

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=ready_to_move&limit=20`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ itemId: string | null }>>();
  assert.equal(cards.some((card) => card.itemId === plannedId), true);
  assert.equal(cards.some((card) => card.itemId === blockedId), false);
});

test("founder execution lens filters blocked cards when requested", async () => {
  const userId = "78787878-7878-4787-8787-787878787878";
  const blockedItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Blocked founder lens item",
      rawContent: "This should appear only in needs_unblock lens."
    }
  });
  assert.equal(blockedItem.statusCode, 201);
  const blockedId = blockedItem.json<{ id: string }>().id;

  const patchBlocked = await app.inject({
    method: "PATCH",
    url: `/brain-items/${blockedId}`,
    payload: {
      execution: {
        status: "blocked",
        nextStep: "Request missing dependency."
      }
    }
  });
  assert.equal(patchBlocked.statusCode, 200);

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=needs_unblock&limit=20`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ itemId: string | null; whyShown: { reasons: string[] } }>>();
  assert.equal(cards.some((card) => card.itemId === blockedId), true);
  assert.ok(cards.some((card) => card.whyShown.reasons.some((reason) => reason.toLowerCase().includes("founder execution lens"))));
});

test("founder execution lens filters feed by execution metadata and linked task state", async () => {
  const userId = "79797979-7979-4797-8797-797979797979";
  const blockedItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Blocked item",
      rawContent: "Needs unblock before moving.",
    }
  });
  assert.equal(blockedItem.statusCode, 201);
  const blockedItemId = blockedItem.json<{ id: string }>().id;

  const candidateItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Candidate item",
      rawContent: "Ready to be converted into a next step."
    }
  });
  assert.equal(candidateItem.statusCode, 201);
  const candidateItemId = candidateItem.json<{ id: string }>().id;

  const activeTask = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Active linked task",
      sourceItemId: candidateItemId
    }
  });
  assert.equal(activeTask.statusCode, 201);
  const activeTaskId = activeTask.json<{ id: string }>().id;
  const setTaskInProgress = await app.inject({
    method: "PATCH",
    url: `/tasks/${activeTaskId}`,
    payload: { status: "in_progress" }
  });
  assert.equal(setTaskInProgress.statusCode, 200);

  const markBlocked = await app.inject({
    method: "PATCH",
    url: `/brain-items/${blockedItemId}`,
    payload: {
      execution: { status: "blocked", nextStep: "Write unblock note" }
    }
  });
  assert.equal(markBlocked.statusCode, 200);

  const markCandidate = await app.inject({
    method: "PATCH",
    url: `/brain-items/${candidateItemId}`,
    payload: {
      execution: { status: "candidate", nextStep: "Convert to task" }
    }
  });
  assert.equal(markCandidate.statusCode, 200);

  const ensureCards = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&limit=20`
  });
  assert.equal(ensureCards.statusCode, 200);

  const blockedLens = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=needs_unblock&limit=20`
  });
  assert.equal(blockedLens.statusCode, 200);
  const blockedCards = blockedLens.json<Array<{ itemId: string | null }>>();
  assert.equal(blockedCards.some((card) => card.itemId === blockedItemId), true);
  assert.equal(blockedCards.some((card) => card.itemId === candidateItemId), false);

  const readyLens = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=ready_to_move&limit=20`
  });
  assert.equal(readyLens.statusCode, 200);
  const readyCards = readyLens.json<Array<{ itemId: string | null }>>();
  assert.equal(readyCards.some((card) => card.itemId === candidateItemId), true);
});

test("founder execution lens filters ready-to-move cards from persisted metadata", async () => {
  const userId = "80808080-8080-4808-8808-808080808080";

  const candidateItemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Ready candidate",
      rawContent: "Should appear in ready-to-move execution lens"
    }
  });
  assert.equal(candidateItemResp.statusCode, 201);
  const candidateItem = candidateItemResp.json<{ id: string }>();
  const candidatePatchResp = await app.inject({
    method: "PATCH",
    url: `/brain-items/${candidateItem.id}`,
    payload: {
      execution: {
        status: "candidate",
        nextStep: "Convert into one lightweight task."
      }
    }
  });
  assert.equal(candidatePatchResp.statusCode, 200);

  const blockedItemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Blocked item",
      rawContent: "Should not appear in ready-to-move execution lens"
    }
  });
  assert.equal(blockedItemResp.statusCode, 201);
  const blockedItem = blockedItemResp.json<{ id: string }>();
  const blockedPatchResp = await app.inject({
    method: "PATCH",
    url: `/brain-items/${blockedItem.id}`,
    payload: {
      execution: {
        status: "blocked",
        nextStep: "Need unblock context first."
      }
    }
  });
  assert.equal(blockedPatchResp.statusCode, 200);

  const feedResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=ready_to_move&limit=10`
  });
  assert.equal(feedResp.statusCode, 200);
  const cards = feedResp.json<Array<{ itemId: string | null; whyShown: { reasons: string[] } }>>();

  assert.ok(cards.length >= 1);
  assert.ok(cards.some((card) => card.itemId === candidateItem.id));
  assert.equal(cards.some((card) => card.itemId === blockedItem.id), false);
  assert.ok(cards[0]?.whyShown.reasons.some((reason) => reason.includes("founder execution lens")));
});
