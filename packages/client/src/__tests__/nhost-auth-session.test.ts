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

test("bootstrapNhostSession keeps stored identity when runtime config exists but live session is unavailable", async () => {
  const localStorageState = new Map<string, string>([
    [
      "nhostSession",
      JSON.stringify({
        accessToken: "stored-token",
        user: { id: "99999999-9999-4999-8999-999999999999" }
      })
    ]
  ]);

  const originalGlobalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
  const mockedLocalStorage = {
    getItem: (key: string) => localStorageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageState.set(key, value);
    },
    removeItem: (key: string) => {
      localStorageState.delete(key);
    }
  };
  (globalThis as { localStorage?: unknown }).localStorage = mockedLocalStorage;

  try {
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
      userId: "99999999-9999-4999-8999-999999999999"
    });
    assert.equal(getConfiguredCurrentUserId(), "99999999-9999-4999-8999-999999999999");
    assert.equal(getConfiguredAccessToken(), "stored-token");
    assert.equal(getIdentityResolutionMode(), "strict");
  } finally {
    if (originalGlobalLocalStorage === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalGlobalLocalStorage;
    }
  }
});
