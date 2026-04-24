import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
  configureHasuraAdminSecret,
  configureHasuraGraphqlUrl,
  configureHasuraRole,
  HasuraGraphqlClientError,
  hasuraGraphqlRequest,
  isHasuraGraphqlConfigured
} from "../graphql/hasura-client";
import { configureCurrentUserId } from "../api/client";

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
  configureHasuraGraphqlUrl(null);
  configureHasuraAdminSecret(null);
  configureHasuraRole(null);
  configureCurrentUserId("11111111-1111-4111-8111-111111111111");
  delete (globalThis as { __YURBRAIN_HASURA_GRAPHQL_URL?: unknown }).__YURBRAIN_HASURA_GRAPHQL_URL;
  delete (globalThis as { __YURBRAIN_HASURA_ADMIN_SECRET?: unknown }).__YURBRAIN_HASURA_ADMIN_SECRET;
  delete (globalThis as { __YURBRAIN_HASURA_ROLE?: unknown }).__YURBRAIN_HASURA_ROLE;
});

afterEach(() => {
  configureHasuraGraphqlUrl(null);
  configureHasuraAdminSecret(null);
  configureHasuraRole(null);
  configureCurrentUserId(null);
  delete (globalThis as { fetch?: unknown }).fetch;
  delete (globalThis as { __YURBRAIN_HASURA_GRAPHQL_URL?: unknown }).__YURBRAIN_HASURA_GRAPHQL_URL;
  delete (globalThis as { __YURBRAIN_HASURA_ADMIN_SECRET?: unknown }).__YURBRAIN_HASURA_ADMIN_SECRET;
  delete (globalThis as { __YURBRAIN_HASURA_ROLE?: unknown }).__YURBRAIN_HASURA_ROLE;
});

test("hasuraGraphqlRequest sends graphql payload and scoped headers", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql/");
  configureHasuraAdminSecret("secret-123");
  configureHasuraRole("user");

  const calls = installFetch(() =>
    new Response(JSON.stringify({ data: { tasks: [] } }), { status: 200 })
  );

  const data = await hasuraGraphqlRequest<{ tasks: unknown[] }>(
    "query TestTasks { tasks { id } }"
  );

  assert.deepEqual(data, { tasks: [] });
  assert.equal(calls[0]?.url, "https://hasura.example.com/v1/graphql");
  assert.equal(calls[0]?.init?.method, "POST");
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("x-hasura-admin-secret"), "secret-123");
  assert.equal(headers.get("x-hasura-user-id"), "11111111-1111-4111-8111-111111111111");
  assert.equal(headers.get("x-hasura-role"), "user");
});

test("isHasuraGraphqlConfigured reflects configured endpoint", () => {
  assert.equal(isHasuraGraphqlConfigured(), false);
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  assert.equal(isHasuraGraphqlConfigured(), true);
});

test("hasuraGraphqlRequest fails when endpoint is missing", async () => {
  await assert.rejects(
    () => hasuraGraphqlRequest("query MissingConfig { __typename }"),
    /Hasura GraphQL endpoint is not configured/
  );
});

test("hasuraGraphqlRequest surfaces graphql errors", async () => {
  configureHasuraGraphqlUrl("https://hasura.example.com/v1/graphql");
  installFetch(() =>
    new Response(
      JSON.stringify({
        errors: [{ message: "permission denied" }]
      }),
      { status: 200 }
    )
  );

  await assert.rejects(
    () => hasuraGraphqlRequest("query Broken { tasks { id } }"),
    (error: unknown) =>
      error instanceof HasuraGraphqlClientError &&
      error.code === "HASURA_GRAPHQL_ERROR" &&
      error.message === "Unable to complete this request right now."
  );
});
