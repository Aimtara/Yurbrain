import assert from "node:assert/strict";
import test from "node:test";

import { getNhostGraphqlTypename } from "../services/nhost/graphql";

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
