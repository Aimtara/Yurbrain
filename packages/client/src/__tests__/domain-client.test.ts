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

  assert.equal(calls[0]?.url, "/founder-review?window=7d&userId=11111111-1111-1111-1111-111111111111&includeAi=1");
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

test("domain client createBrainItem uses GraphQL CRUD adapter when configured", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  const calls = installFetch((call) => {
    const body = JSON.parse(String(call.init?.body ?? "{}")) as { query?: string };
    if (body.query?.includes("GraphqlCreateBrainItem")) {
      return new Response(
        JSON.stringify({
          data: {
            insert_brain_items_one: {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              user_id: "11111111-1111-4111-8111-111111111111",
              type: "note",
              content_type: "text",
              title: "GraphQL create item",
              raw_content: "Created through GraphQL adapter",
              source_app: null,
              source_link: null,
              topic_guess: null,
              status: "active",
              created_at: "2026-04-21T00:00:00.000Z",
              updated_at: "2026-04-21T00:00:00.000Z"
            }
          }
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  });
  const client = createYurbrainDomainClient();

  const created = await client.createBrainItem<{ id: string; userId: string }>({
    type: "note",
    title: "GraphQL create item",
    rawContent: "Created through GraphQL adapter"
  });

  assert.equal(created.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(created.userId, "11111111-1111-4111-8111-111111111111");
  assert.equal(calls[0]?.url, "https://hasura.example.com/v1/graphql");
  const createCall = calls.find((call) =>
    JSON.parse(String(call.init?.body ?? "{}")).query?.includes("GraphqlCreateBrainItem")
  );
  assert.ok(createCall);
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

test("domain client founder review defaults to founder review route without userId", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainDomainClient();

  await client.getFounderReview({ window: "7d", includeAi: true });

  assert.equal(calls[0]?.url, "/founder-review?window=7d&includeAi=1");
});
