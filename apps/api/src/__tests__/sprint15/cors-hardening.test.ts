import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

function restoreEnv(previous: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test("local development allows localhost origins", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    NHOST_PROJECT_ENV: process.env.NHOST_PROJECT_ENV,
    API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
    YURBRAIN_ALLOWED_ORIGINS: process.env.YURBRAIN_ALLOWED_ORIGINS
  };
  process.env.NODE_ENV = "test";
  process.env.NHOST_PROJECT_ENV = "local";
  delete process.env.API_ALLOWED_ORIGINS;
  delete process.env.YURBRAIN_ALLOWED_ORIGINS;

  const dbPath = createDbPath("cors-localhost-origin");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { origin: "http://localhost:3000" }
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers["access-control-allow-origin"], "http://localhost:3000");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.equal(response.headers.vary, "Origin");
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
    restoreEnv(previous);
  }
});

test("configured origins are allowed in staging", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    NHOST_PROJECT_ENV: process.env.NHOST_PROJECT_ENV,
    API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
    YURBRAIN_ALLOWED_ORIGINS: process.env.YURBRAIN_ALLOWED_ORIGINS
  };
  process.env.NODE_ENV = "test";
  process.env.NHOST_PROJECT_ENV = "staging";
  process.env.API_ALLOWED_ORIGINS = "https://staging.yurbrain.app,https://staging-admin.yurbrain.app";
  delete process.env.YURBRAIN_ALLOWED_ORIGINS;

  const dbPath = createDbPath("cors-configured-origin");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "OPTIONS",
      url: "/brain-items",
      headers: { origin: "https://staging.yurbrain.app" }
    });
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "https://staging.yurbrain.app");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.equal(response.headers.vary, "Origin");
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
    restoreEnv(previous);
  }
});

test("unknown origins are rejected in production without wildcard credentials", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    NHOST_PROJECT_ENV: process.env.NHOST_PROJECT_ENV,
    API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
    YURBRAIN_ALLOWED_ORIGINS: process.env.YURBRAIN_ALLOWED_ORIGINS
  };
  process.env.NODE_ENV = "production";
  process.env.NHOST_PROJECT_ENV = "production";
  process.env.API_ALLOWED_ORIGINS = "https://app.yurbrain.ai";
  delete process.env.YURBRAIN_ALLOWED_ORIGINS;

  const dbPath = createDbPath("cors-reject-unknown-origin");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { origin: "https://evil.example" }
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
    assert.equal(response.headers["access-control-allow-credentials"], undefined);
    assert.equal(response.json<{ error: { code: string }; message: string }>().error.code, "ORIGIN_NOT_ALLOWED");
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
    restoreEnv(previous);
  }
});

test("staging never falls back to wildcard origins when credentials are enabled", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    NHOST_PROJECT_ENV: process.env.NHOST_PROJECT_ENV,
    API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
    YURBRAIN_ALLOWED_ORIGINS: process.env.YURBRAIN_ALLOWED_ORIGINS
  };
  process.env.NODE_ENV = "test";
  process.env.NHOST_PROJECT_ENV = "staging";
  process.env.API_ALLOWED_ORIGINS = "https://staging.yurbrain.app";
  delete process.env.YURBRAIN_ALLOWED_ORIGINS;

  const dbPath = createDbPath("cors-no-wildcard-credentials");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const allowedResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { origin: "https://staging.yurbrain.app" }
    });
    assert.equal(allowedResponse.statusCode, 401);
    assert.equal(allowedResponse.headers["access-control-allow-origin"], "https://staging.yurbrain.app");
    assert.notEqual(allowedResponse.headers["access-control-allow-origin"], "*");
    assert.equal(allowedResponse.headers["access-control-allow-credentials"], "true");

    const rejectedResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { origin: "https://unknown-staging.example" }
    });
    assert.equal(rejectedResponse.statusCode, 403);
    assert.notEqual(rejectedResponse.headers["access-control-allow-origin"], "*");
    assert.equal(rejectedResponse.headers["access-control-allow-credentials"], undefined);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
    restoreEnv(previous);
  }
});
