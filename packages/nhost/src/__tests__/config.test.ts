import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveMobilePublicNhostConfig,
  resolveServerNhostConfig,
  resolveSharedNhostRuntimeConfig,
  resolveWebPublicNhostConfig
} from "../client";

test("web public config derives service URLs from backend URL", () => {
  const config = resolveWebPublicNhostConfig({
    NEXT_PUBLIC_NHOST_BACKEND_URL: "https://staging.example.nhost.run/",
    NEXT_PUBLIC_NHOST_ANON_KEY: "public-anon-key"
  });

  assert.equal(config.backendUrl, "https://staging.example.nhost.run");
  assert.equal(config.authUrl, "https://staging.example.nhost.run/v1/auth");
  assert.equal(config.graphqlUrl, "https://staging.example.nhost.run/v1/graphql");
  assert.equal(config.functionsUrl, "https://staging.example.nhost.run/v1/functions");
  assert.equal(config.storageUrl, "https://staging.example.nhost.run/v1/storage");
  assert.equal(config.anonKey, "public-anon-key");
});

test("mobile public config supports explicit service URLs", () => {
  const config = resolveMobilePublicNhostConfig({
    EXPO_PUBLIC_NHOST_AUTH_URL: "https://auth.example.test/v1/",
    EXPO_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.example.test/v1/graphql/",
    EXPO_PUBLIC_NHOST_FUNCTIONS_URL: "https://functions.example.test/v1/",
    EXPO_PUBLIC_NHOST_STORAGE_URL: "https://storage.example.test/v1/",
    EXPO_PUBLIC_NHOST_ANON_KEY: "mobile-public-anon-key"
  });

  assert.equal(config.authUrl, "https://auth.example.test/v1");
  assert.equal(config.graphqlUrl, "https://graphql.example.test/v1/graphql");
  assert.equal(config.functionsUrl, "https://functions.example.test/v1");
  assert.equal(config.storageUrl, "https://storage.example.test/v1");
  assert.equal(config.anonKey, "mobile-public-anon-key");
});

test("shared runtime config returns null when Nhost is not configured", () => {
  assert.equal(resolveSharedNhostRuntimeConfig({}), null);
});

test("server config requires admin secret and keeps it server-only", () => {
  const config = resolveServerNhostConfig({
    NHOST_BACKEND_URL: "https://prod.example.nhost.run",
    NHOST_ANON_KEY: "server-visible-anon-key",
    NHOST_ADMIN_SECRET: "server-only-admin-secret"
  });

  assert.equal(config.backendUrl, "https://prod.example.nhost.run");
  assert.equal(config.authUrl, "https://prod.example.nhost.run/v1/auth");
  assert.equal(config.adminSecret, "server-only-admin-secret");
});
