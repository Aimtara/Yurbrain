import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  bootstrapNhostSession,
  resetNhostBootstrapStateForTests,
  setNhostEnvResolver
} from "../auth/nhost";
import {
  getIdentityResolutionMode,
  configureIdentityResolutionMode,
  configureAccessToken,
  configureCurrentUserId,
  getConfiguredAccessToken,
  getConfiguredCurrentUserId
} from "../api/client";
import { configureHasuraGraphqlUrl, isHasuraGraphqlConfigured } from "../graphql/hasura-client";

afterEach(() => {
  resetNhostBootstrapStateForTests();
  setNhostEnvResolver(null);
  configureIdentityResolutionMode("legacy");
  configureAccessToken(null);
  configureCurrentUserId(null);
  configureHasuraGraphqlUrl(null);
});

test("bootstrapNhostSession returns disabled without nhost config", async () => {
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
});

test("bootstrapNhostSession does not mutate identity when nhost config is absent", async () => {
  configureCurrentUserId("stale-user");
  configureAccessToken("stale-token");
  configureHasuraGraphqlUrl("https://stale.example.com/v1/graphql");
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
  assert.equal(getConfiguredCurrentUserId(), "stale-user");
  assert.equal(getConfiguredAccessToken(), "stale-token");
  assert.equal(isHasuraGraphqlConfigured(), true);
});

test("bootstrapNhostSession hydrates graphql config and stays non-invasive without session", async () => {
  configureCurrentUserId("legacy-user");
  configureAccessToken("legacy-token");
  configureHasuraGraphqlUrl(null);
  assert.equal(isHasuraGraphqlConfigured(), false);

  setNhostEnvResolver(() => ({
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.foundation.example/v1/graphql",
    NEXT_PUBLIC_NHOST_AUTH_URL: "https://auth.foundation.example/v1"
  }));

  const result = await bootstrapNhostSession();

  assert.deepEqual(result, { configured: true });
  assert.equal(isHasuraGraphqlConfigured(), true);
  assert.equal(getConfiguredCurrentUserId(), "legacy-user");
  assert.equal(getConfiguredAccessToken(), "legacy-token");
});

test("bootstrapNhostSession enforces strict identity mode and clears stale identity without session", async () => {
  configureCurrentUserId("legacy-user");
  configureAccessToken("legacy-token");
  configureIdentityResolutionMode("legacy");
  setNhostEnvResolver(() => ({
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.foundation.example/v1/graphql",
    NEXT_PUBLIC_NHOST_AUTH_URL: "https://auth.foundation.example/v1"
  }));

  const result = await bootstrapNhostSession();

  assert.deepEqual(result, { configured: true });
  assert.equal(getIdentityResolutionMode(), "strict");
  assert.equal(getConfiguredCurrentUserId(), null);
  assert.equal(getConfiguredAccessToken(), null);
});
