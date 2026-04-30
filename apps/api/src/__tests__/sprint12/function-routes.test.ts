import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";
import { setLlmProviderConfigResolverForTests } from "../../services/ai/provider";

test.after(async () => {
  await app.close();
});

test.afterEach(() => {
  setLlmProviderConfigResolverForTests(null);
});

test("GET /functions/feed returns ranked cards with whyShown quality", async () => {
  const userId = "14141414-1414-4414-8414-141414141414";
  const headers = { "x-yurbrain-user-id": userId };
  const captures = [
    "Draft migration review notes with continuity checkpoints.",
    "Follow up on function routing alignment for feed and founder review.",
    "Collect ranking evidence for whyShown quality in function mode."
  ];

  for (const content of captures) {
    const response = await app.inject({
      method: "POST",
      url: "/capture/intake",
      headers,
      payload: {
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
  assert.equal(direct.statusCode, 200);
  const directCards = direct.json<Array<{ id: string; whyShown: { summary: string }; availableActions: string[] }>>();
  assert.ok(directCards.length >= 1);
  assert.ok(directCards.length <= 2);
  assert.ok(directCards.every((card) => card.whyShown.summary.length > 0));
  assert.ok(directCards.every((card) => card.availableActions.includes("dismiss")));
});

test("feed function actions require owner identity and preserve behavior", async () => {
  const userId = "15151515-1515-4515-8515-151515151515";
  const headers = { "x-yurbrain-user-id": userId };
  const createResp = await app.inject({
    method: "POST",
    url: "/functions/feed/generate-card",
    headers,
    payload: {
      title: "Function action target card",
      body: "Card used to validate feed function actions."
    }
  });
  assert.equal(createResp.statusCode, 201);
  const cardId = createResp.json<{ id: string }>().id;

  const snooze = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/snooze`,
    headers,
    payload: { minutes: 45 }
  });
  assert.equal(snooze.statusCode, 200);

  const refresh = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/refresh`,
    headers,
    payload: {}
  });
  assert.equal(refresh.statusCode, 200);

  const dismiss = await app.inject({
    method: "POST",
    url: `/functions/feed/${cardId}/dismiss`,
    headers,
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

test("next-step function route returns deterministic next action response", async () => {
  const userId = "17171717-1717-4717-8717-171717171717";
  const headers = { "x-yurbrain-user-id": userId };
  const captures = await Promise.all(
    [
      "Prepare one concrete next action for migration docs.",
      "Close open transport mismatches safely.",
      "Verify founder readout remains actionable."
    ].map((content) =>
      app.inject({
        method: "POST",
        url: "/capture/intake",
        headers,
        payload: {
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
    headers,
    payload: { itemIds }
  });
  assert.equal(canonical.statusCode, 201);
  const body = canonical.json<{ suggestedNextAction: string; reason: string }>();
  assert.ok(body.suggestedNextAction.length > 0);
  assert.ok(body.reason.length > 0);
});

test("synthesis function routes use provider path when configured", async () => {
  const userId = "27272727-2727-4727-8727-272727272727";
  const headers = { "x-yurbrain-user-id": userId };
  const captures = await Promise.all(
    [
      "Provider-backed summary should stay grounded in migration blockers.",
      "Next step should be exactly one concrete action tied to current context."
    ].map((content) =>
      app.inject({
        method: "POST",
        url: "/capture/intake",
        headers,
        payload: { type: "text", content }
      })
    )
  );
  captures.forEach((response) => assert.equal(response.statusCode, 201));
  const itemIds = captures.map((response) => response.json<{ itemId: string }>().itemId);

  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "live-provider-route-test-key",
    baseUrl: "https://provider-route.test/v1",
    model: "gpt-test",
    fastModel: "gpt-test",
    reasoningModel: "gpt-test",
    taskModels: {},
    timeoutMs: 1_500,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { messages?: Array<{ role?: string; content?: string }> };
    const instruction = body.messages?.find((message) => message.role === "system")?.content ?? "";
    const isNextStep = /what-should-i-do-next function/i.test(instruction);
    const content = isNextStep
      ? JSON.stringify({
          summary: "Migration work is waiting on one approval edge.",
          suggestedNextStep: "Request final sign-off now.",
          sourceSignals: ["Paused migration execution thread", "Recent continuation mentions pending sign-off"],
          reason: "Sign-off is the only blocker before immediate execution can continue.",
          confidence: 0.76
        })
      : JSON.stringify({
          summary: "Migration progress is coherent but blocked by final release sign-off.",
          blockers: ["Final release sign-off pending"],
          suggestedNextStep: "Get final release sign-off now.",
          sourceSignals: ["Paused migration task in progress", "Latest continuation cites pending sign-off"],
          reason: "All evidence points to sign-off as the gating blocker."
        });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content
            }
          }
        ]
      })
    } as Response;
  };

  try {
    const summarizeResponse = await app.inject({
      method: "POST",
      url: "/functions/summarize-progress",
      headers,
      payload: { itemIds }
    });
    assert.equal(summarizeResponse.statusCode, 201);
    const summarizeBody = summarizeResponse.json<{
      usedFallback?: boolean;
      fallbackReason?: string;
      sourceSignals?: string[];
      suggestedNextAction: string;
      reason: string;
    }>();
    assert.equal(summarizeBody.usedFallback, false);
    assert.equal(summarizeBody.fallbackReason, undefined);
    assert.ok((summarizeBody.sourceSignals?.length ?? 0) >= 1);
    assert.match(summarizeBody.suggestedNextAction, /sign-off/i);
    assert.match(summarizeBody.reason, /blocker|sign-off/i);

    const nextStepResponse = await app.inject({
      method: "POST",
      url: "/functions/what-should-i-do-next",
      headers,
      payload: { itemIds }
    });
    assert.equal(nextStepResponse.statusCode, 201);
    const nextStepBody = nextStepResponse.json<{
      usedFallback?: boolean;
      fallbackReason?: string;
      sourceSignals?: string[];
      suggestedNextAction: string;
      confidence?: number;
    }>();
    assert.equal(nextStepBody.usedFallback, false);
    assert.equal(nextStepBody.fallbackReason, undefined);
    assert.ok((nextStepBody.sourceSignals?.length ?? 0) >= 1);
    assert.match(nextStepBody.suggestedNextAction, /sign-off|resume/i);
    assert.ok(typeof nextStepBody.confidence === "number");
    assert.ok((nextStepBody.confidence ?? 0) >= 0 && (nextStepBody.confidence ?? 0) <= 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress returns 404 for non-owner item access", async () => {
  const ownerId = "18111111-1811-4811-8811-181111111111";
  const outsiderId = "19111111-1911-4911-8911-191111111111";
  const created = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers: { "x-yurbrain-user-id": ownerId },
    payload: {
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
