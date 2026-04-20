import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  bootstrapNhostSession,
  resetNhostBootstrapStateForTests,
  setNhostEnvResolver
} from "../auth/nhost";
import { configureCurrentUserId, getConfiguredCurrentUserId } from "../api/client";
import { configureHasuraGraphqlUrl, isHasuraGraphqlConfigured } from "../graphql/hasura-client";

afterEach(() => {
  resetNhostBootstrapStateForTests();
  setNhostEnvResolver(null);
  configureCurrentUserId(null);
  configureHasuraGraphqlUrl(null);
});

test("bootstrapNhostSession returns disabled without nhost config", async () => {
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
});

test("bootstrapNhostSession does not mutate identity when nhost config is absent", async () => {
  configureCurrentUserId("stale-user");
  configureHasuraGraphqlUrl("https://stale.example.com/v1/graphql");
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
  assert.equal(getConfiguredCurrentUserId(), "stale-user");
  assert.equal(isHasuraGraphqlConfigured(), true);
});
