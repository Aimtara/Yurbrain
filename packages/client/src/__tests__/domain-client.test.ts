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

test("domain client founder review defaults to function endpoint without userId", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainDomainClient();

  await client.getFounderReview({ window: "7d", includeAi: true });

  assert.equal(calls[0]?.url, "/functions/founder-review?window=7d&includeAi=1");
});
