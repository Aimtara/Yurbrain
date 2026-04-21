import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  bootstrapNhostSession,
  resetNhostBootstrapStateForTests,
  setNhostEnvResolver,
  setNhostClientFactory
} from "../auth/nhost";
import {
  configureAccessToken,
  configureCurrentUserId,
  getConfiguredAccessToken,
  getConfiguredCurrentUserId,
  getIdentityResolutionMode
} from "../api/client";

afterEach(() => {
  resetNhostBootstrapStateForTests();
  setNhostEnvResolver(null);
  setNhostClientFactory(null);
  configureAccessToken(null);
  configureCurrentUserId(null);
});

test("bootstrapNhostSession hydrates identity from authenticated session", async () => {
  setNhostEnvResolver(() => ({
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.foundation.example/v1/graphql",
    NEXT_PUBLIC_NHOST_AUTH_URL: "https://auth.foundation.example/v1"
  }));
  setNhostClientFactory(() => ({
    getUserSession: () => ({
      accessToken: "session-token",
      user: {
        id: "55555555-5555-4555-8555-555555555555"
      }
    })
  }));

  const result = await bootstrapNhostSession();

  assert.deepEqual(result, {
    configured: true,
    userId: "55555555-5555-4555-8555-555555555555"
  });
  assert.equal(getConfiguredCurrentUserId(), "55555555-5555-4555-8555-555555555555");
  assert.equal(getConfiguredAccessToken(), "session-token");
  assert.equal(getIdentityResolutionMode(), "strict");
});
