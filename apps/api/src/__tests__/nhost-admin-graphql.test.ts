import assert from "node:assert/strict";
import test from "node:test";

import { getNhostGraphqlTypename, queryNhostAdminGraphql } from "../services/nhost/graphql";

test("getNhostGraphqlTypename uses server-side admin graphql helper", async () => {
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;
  try {
    (globalThis as { fetch?: unknown }).fetch = async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-hasura-admin-secret"), "server-admin-secret");
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { __typename: "Query" } })
      } as Response;
    };

    const typename = await getNhostGraphqlTypename({
      NHOST_BACKEND_URL: "https://example.nhost.run",
      NHOST_GRAPHQL_URL: "https://example.nhost.run/v1/graphql",
      NHOST_ADMIN_SECRET: "server-admin-secret",
      NHOST_ANON_KEY: "anon-key-value"
    });

    assert.equal(typename, "Query");
  } finally {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
  }
});

test("queryNhostAdminGraphql retries retryable failures and logs sanitized metadata", async () => {
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;
  const infoLogs: Array<Record<string, unknown>> = [];
  const warnLogs: Array<Record<string, unknown>> = [];
  const errorLogs: Array<Record<string, unknown>> = [];
  let fetchCalls = 0;

  try {
    (globalThis as { fetch?: unknown }).fetch = async (_url: string, init?: RequestInit) => {
      fetchCalls += 1;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-hasura-admin-secret"), "server-admin-secret");
      if (fetchCalls === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => ({})
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { __typename: "Query" } })
      } as Response;
    };

    const typename = await queryNhostAdminGraphql<{ __typename: string }>(
      "query ApiNhostHealth { __typename }",
      {},
      {
        NHOST_BACKEND_URL: "https://example.nhost.run",
        NHOST_GRAPHQL_URL: "https://example.nhost.run/v1/graphql",
        NHOST_ADMIN_SECRET: "server-admin-secret",
        NHOST_ANON_KEY: "anon-key-value"
      },
      {
        operationName: "nhost_observability_retry_test",
        maxRetries: 1,
        initialBackoffMs: 1,
        correlationId: "corr-test-1",
        logger: {
          info: (meta) => infoLogs.push(meta),
          warn: (meta) => warnLogs.push(meta),
          error: (meta) => errorLogs.push(meta)
        }
      }
    );

    assert.equal(typename.__typename, "Query");
    assert.equal(fetchCalls, 2);
    assert.equal(warnLogs.length, 1);
    assert.equal(errorLogs.length, 0);
    assert.equal(warnLogs[0]?.nhostErrorCode, "NHOST_HTTP_ERROR");
    assert.equal(warnLogs[0]?.statusCode, 503);
    assert.equal(warnLogs[0]?.retryable, true);
    assert.equal(warnLogs[0]?.operation, "executeServerGraphqlWithAdminSecret");
    assert.equal(warnLogs[0]?.correlationId, "corr-test-1");
    assert.ok(!("headers" in warnLogs[0]));
    assert.ok(!("adminSecret" in warnLogs[0]));
    assert.ok(infoLogs.length >= 2);
  } finally {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
  }
});
