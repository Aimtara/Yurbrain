import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { configureApiBaseUrl, configureCurrentUserId } from "../api/client";
import { createYurbrainClient } from "../createYurbrainClient";
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

test("yurbrain client uses founder mode and lens helpers", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainClient();

  await client.setFounderMode(true);
  await client.setDefaultFeedLens("in_progress");

  const firstBody = JSON.parse(String(calls[0]?.init?.body ?? "{}")) as Record<string, unknown>;
  const secondBody = JSON.parse(String(calls[1]?.init?.body ?? "{}")) as Record<string, unknown>;
  assert.equal(calls[0]?.url, "/preferences/me");
  assert.equal(firstBody.founderMode, true);
  assert.equal(calls[1]?.url, "/preferences/me");
  assert.equal(secondBody.defaultLens, "in_progress");
});

test("yurbrain client maps founder diagnostics to function endpoint", async () => {
  const calls = installFetch(() => new Response("{}", { status: 200 }));
  const client = createYurbrainClient();

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

test("yurbrain client touchBrainItem performs read then patch", async () => {
  const calls = installFetch((call) => {
    if (call.url === "/brain-items/item-1") {
      return new Response(
        JSON.stringify({
          id: "item-1",
          title: "Item title",
          rawContent: "Raw content",
          status: "active"
        }),
        { status: 200 }
      );
    }
    return new Response("{}", { status: 200 });
  });
  const client = createYurbrainClient();

  await client.touchBrainItem("item-1");

  assert.equal(calls[0]?.url, "/brain-items/item-1");
  assert.equal(calls[1]?.url, "/brain-items/item-1");
  assert.equal(calls[1]?.init?.method, "PATCH");
});
