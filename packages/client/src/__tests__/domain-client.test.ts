import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { configureApiBaseUrl, configureCurrentUserId } from "../api/client";
import { createYurbrainDomainClient } from "../domain/client";
import { configureHasuraGraphqlUrl } from "../graphql";

type FetchCall = { url: string; init?: RequestInit };

function installFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  (globalThis as { fetch?: unknown }).fetch = async (url: string, init?: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return handler(call);
  };
  return calls;
}

beforeEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId("11111111-1111-4111-8111-111111111111");
  configureHasuraGraphqlUrl(null);
});

afterEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId(null);
  configureHasuraGraphqlUrl(null);
  delete (globalThis as { fetch?: unknown }).fetch;
});

test("domain client routes founder review query params", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainDomainClient();

  await client.getFounderReview({
    window: "7d",
    userId: "11111111-1111-1111-1111-111111111111",
    includeAi: true
  });

  assert.equal(calls[0]?.url, "/functions/founder-review?window=7d&userId=11111111-1111-1111-1111-111111111111&includeAi=1");
});

test("domain client addComment writes user message payload", async () => {
  const calls = installFetch(() => new Response("{}", { status: 201 }));
  const client = createYurbrainDomainClient();

  await client.addComment("thread-1", "keep moving");

  assert.equal(calls[0]?.url, "/messages");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(
    String(calls[0]?.init?.body),
    JSON.stringify({ threadId: "thread-1", role: "user", content: "keep moving" })
  );
});

test("domain client supports per-method overrides", async () => {
  const client = createYurbrainDomainClient({
    getFeed: async () => [{ id: "override-card" }]
  });

  const cards = await client.getFeed<Array<{ id: string }>>();
  assert.deepEqual(cards, [{ id: "override-card" }]);
});

test("domain client uses GraphQL CRUD adapter when configured", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch(() =>
    new Response(JSON.stringify({ data: { brain_items: [] } }), { status: 200 })
  );
  const client = createYurbrainDomainClient();

  await client.listBrainItems();

  assert.equal(calls[0]?.url, "https://hasura.example.com/v1/graphql");
  assert.equal(calls[0]?.init?.method, "POST");
});

test("domain client createBrainItem remains REST-backed even when GraphQL is configured", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch((call) => {
    if (call.url === "/brain-items") {
      return new Response(
        JSON.stringify({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          userId: "11111111-1111-4111-8111-111111111111",
          type: "note",
          title: "REST create item",
          rawContent: "Created through REST route",
          status: "active",
          createdAt: "2026-04-21T00:00:00.000Z",
          updatedAt: "2026-04-21T00:00:00.000Z"
        }),
        { status: 201 }
      );
    }
    return new Response("{}", { status: 200 });
  });
  const client = createYurbrainDomainClient();

  const created = await client.createBrainItem<{ id: string; userId: string }>({
    type: "note",
    title: "REST create item",
    rawContent: "Created through REST route"
  });

  assert.equal(created.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(created.userId, "11111111-1111-4111-8111-111111111111");
  assert.equal(calls[0]?.url, "/brain-items");
  assert.equal(calls[0]?.init?.method, "POST");
});

test("domain client listSessions GraphQL path queries sessions by user ownership", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch((call) => {
    const body = JSON.parse(String(call.init?.body ?? "{}")) as {
      query?: string;
      variables?: Record<string, unknown>;
    };
    if (body.query?.includes("GraphqlListSessionsByState")) {
      assert.equal(body.variables?.state, "running");
      assert.equal(body.variables?.taskId, undefined);
      return new Response(
        JSON.stringify({
          data: {
            sessions: [
              {
                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                task_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                state: "running",
                started_at: "2026-04-21T00:01:00.000Z",
                ended_at: null
              }
            ]
          }
        }),
        { status: 200 }
      );
    }
    if (body.query?.includes("GraphqlListSessionsByUser")) {
      return new Response(
        JSON.stringify({
          data: {
            sessions: []
          }
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  });
  const client = createYurbrainDomainClient();

  const sessions = await client.listSessions<Array<{ id: string; state: string }>>({
    state: "running",
    userId: "11111111-1111-4111-8111-111111111111"
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0]?.state, "running");
  assert.equal(calls[0]?.url, "https://hasura.example.com/v1/graphql");
});

test("domain client GraphQL mode routes session lifecycle through function helper endpoint", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch((call) => {
    if (call.url === "/functions/session-helper") {
      return new Response(JSON.stringify({ id: "session-1", state: "running" }), { status: 201 });
    }
    if (call.url === "/functions/feed?lens=all&limit=5") {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  });
  const client = createYurbrainDomainClient();

  await client.startSession("task-123");
  await client.pauseSession("session-1");
  await client.finishSession("session-1");
  await client.getFeed({ lens: "all", limit: 5 });

  assert.equal(calls[0]?.url, "/functions/session-helper");
  assert.equal(calls[1]?.url, "/functions/session-helper");
  assert.equal(calls[2]?.url, "/functions/session-helper");
  assert.equal(calls[3]?.url, "/functions/feed?lens=all&limit=5");
  const startPayload = JSON.parse(String(calls[0]?.init?.body ?? "{}")) as Record<string, unknown>;
  const pausePayload = JSON.parse(String(calls[1]?.init?.body ?? "{}")) as Record<string, unknown>;
  const finishPayload = JSON.parse(String(calls[2]?.init?.body ?? "{}")) as Record<string, unknown>;
  assert.deepEqual(startPayload, { action: "start", taskId: "task-123" });
  assert.deepEqual(pausePayload, { action: "pause", sessionId: "session-1" });
  assert.deepEqual(finishPayload, { action: "finish", sessionId: "session-1" });
  const graphqlCall = calls.find((call) => call.url === "https://hasura.example.com/v1/graphql");
  assert.equal(graphqlCall, undefined);
});

test("domain client founder review defaults to founder review route without userId", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainDomainClient();

  await client.getFounderReview({ window: "7d", includeAi: true });

  assert.equal(calls[0]?.url, "/functions/founder-review?window=7d&includeAi=1");
});

test("domain client routes founder diagnostics query params", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainDomainClient();

  await client.getFounderDiagnostics({
    window: "7d",
    userId: "11111111-1111-1111-1111-111111111111",
    includeAi: true
  });

  assert.equal(
    calls[0]?.url,
    "/functions/founder-review/diagnostics?window=7d&userId=11111111-1111-1111-1111-111111111111&includeAi=1"
  );
});

test("domain client founder diagnostics in function mode preserves actionable response shape", async () => {
  const calls = installFetch((call) => {
    if (call.url === "/functions/founder-review/diagnostics?window=7d") {
      return new Response(
        JSON.stringify({
          generatedAt: "2026-04-21T00:00:00.000Z",
          window: "7d",
          summary: {
            itemCount: 3,
            taskCount: 2,
            sessionCount: 1,
            blockedCount: 1,
            staleCount: 1,
            continuationGapCount: 1
          },
          focusItems: [
            {
              itemId: "11111111-1111-4111-8111-111111111111",
              title: "Follow up migration thread",
              reason: "blocked",
              detail: "Blocked signals accumulating",
              action: {
                id: "founder-diagnostics-open-item",
                label: "Open item detail for focused follow-up",
                target: "item",
                itemId: "11111111-1111-4111-8111-111111111111"
              }
            }
          ],
          focusActions: [
            {
              id: "founder-diagnostics-open-loops",
              label: "Open open loops with founder context",
              target: "feed",
              lens: "open_loops"
            }
          ],
          strongestKeywords: ["migration"],
          latestItemTitles: ["Follow up migration thread"]
        }),
        { status: 200 }
      );
    }
    return new Response("{}", { status: 200 });
  });
  const client = createYurbrainDomainClient();

  const diagnostics = await client.getFounderDiagnostics<{
    summary: { blockedCount: number };
    focusItems: Array<{ action: { target: string } }>;
  }>({ window: "7d" });

  assert.equal(calls[0]?.url, "/functions/founder-review/diagnostics?window=7d");
  assert.equal(diagnostics.summary.blockedCount, 1);
  assert.equal(diagnostics.focusItems[0]?.action.target, "item");
});

test("domain client keeps CRUD/computed boundary in GraphQL mode", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch((call) => {
    if (call.url === "/functions/feed?lens=all&limit=5") {
      return new Response("[]", { status: 200 });
    }

    const body = JSON.parse(String(call.init?.body ?? "{}")) as { query?: string };
    if (body.query?.includes("GraphqlListTasks")) {
      return new Response(
        JSON.stringify({
          data: {
            tasks: []
          }
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  });

  const client = createYurbrainDomainClient();
  await client.getFeed({ lens: "all", limit: 5 });
  await client.listTasks();

  const feedCall = calls.find((call) => call.url === "/functions/feed?lens=all&limit=5");
  assert.ok(feedCall);
  const graphqlCall = calls.find((call) => call.url === "https://hasura.example.com/v1/graphql");
  assert.ok(graphqlCall);
});

test("domain client function mode routes feed actions and AI thin-slice calls to function endpoints", async () => {
  const calls = installFetch((call) => {
    if (call.url === "/functions/feed?lens=keep_in_mind&limit=3") {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (call.url === "/functions/feed/card-1/dismiss") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (call.url === "/functions/feed/card-1/snooze") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (call.url === "/functions/feed/card-1/refresh") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (call.url === "/functions/summarize-progress") {
      return new Response(JSON.stringify({ summary: "ok" }), { status: 201 });
    }
    if (call.url === "/functions/what-should-i-do-next") {
      return new Response(JSON.stringify({ suggestedNextAction: "next" }), { status: 201 });
    }
    if (call.url === "/functions/summarize") {
      return new Response(JSON.stringify({ type: "summary", ai: { content: "summary" } }), { status: 201 });
    }
    if (call.url === "/functions/classify") {
      return new Response(JSON.stringify({ type: "classification", ai: { content: "classify" } }), { status: 201 });
    }
    if (call.url === "/functions/query") {
      return new Response(
        JSON.stringify({
          threadId: "thread-1",
          userMessage: { id: "m1", threadId: "thread-1", role: "user", content: "question", createdAt: new Date().toISOString() },
          message: { id: "m2", threadId: "thread-1", role: "assistant", content: "answer", createdAt: new Date().toISOString() },
          ai: { content: "answer", confidence: 0.9, metadata: {} },
          fallbackUsed: false
        }),
        { status: 201 }
      );
    }
    if (call.url === "/functions/convert") {
      return new Response(JSON.stringify({ outcome: "task_created" }), { status: 201 });
    }
    if (call.url === "/functions/founder-review?window=7d&includeAi=1") {
      return new Response(JSON.stringify({ window: "7d" }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  });
  const client = createYurbrainDomainClient();

  await client.getFeed({ lens: "keep_in_mind", limit: 3 });
  await client.dismissFeedCard("card-1");
  await client.snoozeFeedCard("card-1", 30);
  await client.refreshFeedCard("card-1");
  await client.summarizeCluster({ itemIds: ["item-1"] });
  await client.requestNextStep({ itemIds: ["item-1"] });
  await client.summarizeBrainItem({ itemId: "item-1", rawContent: "summary input" });
  await client.classifyBrainItem({ itemId: "item-1", rawContent: "classify input" });
  await client.queryBrainItemThread({ threadId: "thread-1", question: "What next?" });
  await client.planThis({ sourceItemId: "item-1", content: "Create follow-up task" });
  await client.getFounderReview({ window: "7d", includeAi: true });

  assert.ok(calls.find((call) => call.url === "/functions/feed?lens=keep_in_mind&limit=3"));
  assert.ok(calls.find((call) => call.url === "/functions/feed/card-1/dismiss"));
  assert.ok(calls.find((call) => call.url === "/functions/feed/card-1/snooze"));
  assert.ok(calls.find((call) => call.url === "/functions/feed/card-1/refresh"));
  assert.ok(calls.find((call) => call.url === "/functions/summarize-progress"));
  assert.ok(calls.find((call) => call.url === "/functions/what-should-i-do-next"));
  assert.ok(calls.find((call) => call.url === "/functions/summarize"));
  assert.ok(calls.find((call) => call.url === "/functions/classify"));
  assert.ok(calls.find((call) => call.url === "/functions/query"));
  assert.ok(calls.find((call) => call.url === "/functions/convert"));
  assert.ok(calls.find((call) => call.url === "/functions/founder-review?window=7d&includeAi=1"));

  const snoozeCall = calls.find((call) => call.url === "/functions/feed/card-1/snooze");
  const summarizeCall = calls.find((call) => call.url === "/functions/summarize-progress");
  const nextStepCall = calls.find((call) => call.url === "/functions/what-should-i-do-next");
  const classifyCall = calls.find((call) => call.url === "/functions/classify");
  const queryCall = calls.find((call) => call.url === "/functions/query");
  const convertCall = calls.find((call) => call.url === "/functions/convert");
  assert.equal(
    String(snoozeCall?.init?.body),
    JSON.stringify({ minutes: 30 })
  );
  assert.equal(
    String(summarizeCall?.init?.body),
    JSON.stringify({ itemIds: ["item-1"] })
  );
  assert.equal(
    String(nextStepCall?.init?.body),
    JSON.stringify({ itemIds: ["item-1"] })
  );
  assert.equal(
    String(classifyCall?.init?.body),
    JSON.stringify({ itemId: "item-1", rawContent: "classify input" })
  );
  assert.equal(
    String(queryCall?.init?.body),
    JSON.stringify({ threadId: "thread-1", question: "What next?" })
  );
  assert.equal(
    String(convertCall?.init?.body),
    JSON.stringify({ sourceItemId: "item-1", content: "Create follow-up task" })
  );
});
