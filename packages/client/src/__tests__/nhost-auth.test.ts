import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  bootstrapNhostSession,
  resetNhostBootstrapStateForTests,
  setNhostEnvResolver,
  setNhostClientFactory
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

const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

afterEach(() => {
  resetNhostBootstrapStateForTests();
  setNhostEnvResolver(null);
  setNhostClientFactory(null);
  configureIdentityResolutionMode("legacy");
  configureAccessToken(null);
  configureCurrentUserId(null);
  configureHasuraGraphqlUrl(null);
  const globalWithStorage = globalThis as { localStorage?: unknown };
  if (originalLocalStorage === undefined) {
    delete globalWithStorage.localStorage;
  } else {
    globalWithStorage.localStorage = originalLocalStorage;
  }
});

test("bootstrapNhostSession returns disabled without nhost config", async () => {
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
});

test("bootstrapNhostSession reuses stored browser session identity when nhost runtime config is missing", async () => {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    }
  };
  const globalWithStorage = globalThis as typeof globalThis & { localStorage?: typeof localStorageMock };
  const previousStorage = globalWithStorage.localStorage;
  globalWithStorage.localStorage = localStorageMock;

  try {
    localStorageMock.setItem(
      "nhostSession",
      JSON.stringify({
        accessToken: "stored-token",
        user: { id: "66666666-6666-4666-8666-666666666666" }
      })
    );

    const result = await bootstrapNhostSession();

    assert.deepEqual(result, {
      configured: true,
      userId: "66666666-6666-4666-8666-666666666666"
    });
    assert.equal(getIdentityResolutionMode(), "strict");
    assert.equal(getConfiguredCurrentUserId(), "66666666-6666-4666-8666-666666666666");
    assert.equal(getConfiguredAccessToken(), "stored-token");
  } finally {
    if (previousStorage) {
      globalWithStorage.localStorage = previousStorage;
    } else {
      delete globalWithStorage.localStorage;
    }
  }
});

test("bootstrapNhostSession clears stale identity when nhost config is absent", async () => {
  configureCurrentUserId("stale-user");
  configureAccessToken("stale-token");
  configureHasuraGraphqlUrl("https://stale.example.com/v1/graphql");
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
  assert.equal(getIdentityResolutionMode(), "strict");
  assert.equal(getConfiguredCurrentUserId(), null);
  assert.equal(getConfiguredAccessToken(), null);
});

test("bootstrapNhostSession hydrates graphql config and clears stale identity without session", async () => {
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
  assert.equal(isHasuraGraphqlConfigured(), false);
  assert.equal(getConfiguredCurrentUserId(), null);
  assert.equal(getConfiguredAccessToken(), null);
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

test("bootstrapNhostSession keeps stored session identity when nhost session is temporarily unavailable", async () => {
  const storageState = new Map<string, string>();
  storageState.set(
    "nhostSession",
    JSON.stringify({
      accessToken: "stored-token",
      user: { id: "66666666-6666-4666-8666-666666666666" },
      decodedToken: { sub: "66666666-6666-4666-8666-666666666666" }
    })
  );
  (globalThis as { localStorage?: { getItem: (key: string) => string | null } }).localStorage = {
    getItem: (key: string) => storageState.get(key) ?? null
  };

  setNhostEnvResolver(() => ({
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: "https://graphql.foundation.example/v1/graphql",
    NEXT_PUBLIC_NHOST_AUTH_URL: "https://auth.foundation.example/v1"
  }));
  setNhostClientFactory(() => ({
    getUserSession: () => null
  }));

  const result = await bootstrapNhostSession();

  assert.deepEqual(result, {
    configured: true,
    userId: "66666666-6666-4666-8666-666666666666"
  });
  assert.equal(getIdentityResolutionMode(), "strict");
  assert.equal(getConfiguredCurrentUserId(), "66666666-6666-4666-8666-666666666666");
  assert.equal(getConfiguredAccessToken(), "stored-token");
});
