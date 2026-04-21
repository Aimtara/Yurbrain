import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  buildNhostRuntimeConfig,
  setNhostEnvResolver
} from "../auth/nhost";

afterEach(() => {
  setNhostEnvResolver(null);
});

test("buildNhostRuntimeConfig returns null when nhost is not configured", () => {
  setNhostEnvResolver(() => ({}));
  assert.equal(buildNhostRuntimeConfig(), null);
});

test("buildNhostRuntimeConfig derives auth/graphql/functions URLs from subdomain and region", () => {
  setNhostEnvResolver(() => ({
    NEXT_PUBLIC_NHOST_SUBDOMAIN: "abc123",
    NEXT_PUBLIC_NHOST_REGION: "eu-central-1"
  }));
  const config = buildNhostRuntimeConfig();
  assert.ok(config);
  assert.equal(config?.authUrl, "https://abc123.auth.eu-central-1.nhost.run/v1");
  assert.equal(config?.graphqlUrl, "https://abc123.graphql.eu-central-1.nhost.run/v1/graphql");
  assert.equal(config?.functionsUrl, "https://abc123.functions.eu-central-1.nhost.run/v1");
});

test("buildNhostRuntimeConfig honors explicit URL env values", () => {
  setNhostEnvResolver(() => ({
    EXPO_PUBLIC_NHOST_AUTH_URL: "https://auth.example.com/v1",
    EXPO_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.example.com/v1/graphql",
    EXPO_PUBLIC_NHOST_FUNCTIONS_URL: "https://functions.example.com/v1"
  }));
  const config = buildNhostRuntimeConfig();
  assert.ok(config);
  assert.equal(config?.authUrl, "https://auth.example.com/v1");
  assert.equal(config?.graphqlUrl, "https://graphql.example.com/v1/graphql");
  assert.equal(config?.functionsUrl, "https://functions.example.com/v1");
});

