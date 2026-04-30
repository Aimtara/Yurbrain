import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";
import { createTestJwt } from "../helpers/auth-token";
import { resetRateLimitBucketsForTests } from "../../middleware/rate-limit";

process.env.NODE_ENV = "test";
process.env.YURBRAIN_TEST_MODE = "1";

async function strictHeaders(userId: string) {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

test("rate limiting returns 429 after route class quota is exceeded", async () => {
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT;
  const previousWindow = process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
  resetRateLimitBucketsForTests();
  process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT = "2";
  process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = "60000";
  const dbPath = createDbPath("rate-limit-auth-sensitive");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const first = await app.inject({ method: "GET", url: "/auth/me" });
    const second = await app.inject({ method: "GET", url: "/auth/me" });
    const third = await app.inject({ method: "GET", url: "/auth/me" });

    assert.equal(first.statusCode, 401);
    assert.equal(second.statusCode, 401);
    assert.equal(third.statusCode, 429);
    assert.equal(third.json<{ error: { code?: string } }>().error.code, "RATE_LIMITED");
  } finally {
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
    else process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    process.env.NODE_ENV = "test";
    process.env.YURBRAIN_TEST_MODE = "1";
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("rate limiting isolates authenticated user quotas", async () => {
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_FEED_LIMIT;
  const previousWindow = process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
  resetRateLimitBucketsForTests();
  process.env.YURBRAIN_RATE_LIMIT_FEED_LIMIT = "1";
  process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = "60000";
  const dbPath = createDbPath("rate-limit-user-isolation");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const userAHeaders = await strictHeaders("11111111-aaaa-4111-8111-111111111111");
    const userBHeaders = await strictHeaders("22222222-bbbb-4222-8222-222222222222");

    const userAFirst = await app.inject({ method: "GET", url: "/feed", headers: userAHeaders });
    const userASecond = await app.inject({ method: "GET", url: "/feed", headers: userAHeaders });
    const userBFirst = await app.inject({ method: "GET", url: "/feed", headers: userBHeaders });

    assert.equal(userAFirst.statusCode, 200);
    assert.equal(userASecond.statusCode, 429);
    assert.equal(userBFirst.statusCode, 200);
  } finally {
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_FEED_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_FEED_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
    else process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("production-like environments cannot disable every rate limit accidentally", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProjectEnv = process.env.NHOST_PROJECT_ENV;
  const previousDisabled = process.env.YURBRAIN_RATE_LIMIT_DISABLED;
  resetRateLimitBucketsForTests();
  process.env.NODE_ENV = "production";
  process.env.NHOST_PROJECT_ENV = "production";
  process.env.YURBRAIN_RATE_LIMIT_DISABLED = "1";
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT;
  process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT = "2";
  const dbPath = createDbPath("rate-limit-production-not-disabled");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const first = await app.inject({ method: "GET", url: "/auth/me" });
    const second = await app.inject({ method: "GET", url: "/auth/me" });
    const third = await app.inject({ method: "GET", url: "/auth/me" });
    assert.equal(first.statusCode, 401);
    assert.equal(second.statusCode, 401);
    assert.equal(third.statusCode, 429);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousProjectEnv === undefined) delete process.env.NHOST_PROJECT_ENV;
    else process.env.NHOST_PROJECT_ENV = previousProjectEnv;
    if (previousDisabled === undefined) delete process.env.YURBRAIN_RATE_LIMIT_DISABLED;
    else process.env.YURBRAIN_RATE_LIMIT_DISABLED = previousDisabled;
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_AUTH_SENSITIVE_LIMIT = previousLimit;
    process.env.NODE_ENV = "test";
    process.env.YURBRAIN_TEST_MODE = "1";
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("rate limiting protects AI/function routes by authenticated user", async () => {
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_AI_EXPENSIVE_LIMIT;
  const previousWindow = process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
  resetRateLimitBucketsForTests();
  process.env.YURBRAIN_RATE_LIMIT_AI_EXPENSIVE_LIMIT = "1";
  process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = "60000";
  const dbPath = createDbPath("rate-limit-ai-expensive");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const headers = await strictHeaders("33333333-3333-4333-8333-333333333333");
    const first = await app.inject({
      method: "POST",
      url: "/functions/what-should-i-do-next",
      headers,
      payload: {}
    });
    const second = await app.inject({
      method: "POST",
      url: "/functions/what-should-i-do-next",
      headers,
      payload: {}
    });

    assert.equal(first.statusCode, 400);
    assert.equal(second.statusCode, 429);
    assert.equal(second.headers["x-yurbrain-rate-limit-class"], "ai_expensive");
    assert.equal(second.json<{ error: { code?: string } }>().error.code, "RATE_LIMITED");
  } finally {
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_AI_EXPENSIVE_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_AI_EXPENSIVE_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
    else process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("rate limiting protects write-heavy mutation routes", async () => {
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_WRITE_STANDARD_LIMIT;
  const previousWindow = process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
  resetRateLimitBucketsForTests();
  process.env.YURBRAIN_RATE_LIMIT_WRITE_STANDARD_LIMIT = "1";
  process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = "60000";
  const dbPath = createDbPath("rate-limit-write-standard");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const headers = await strictHeaders("44444444-4444-4444-8444-444444444444");
    const first = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: { title: "First write route request" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: { title: "Second write route request" }
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 429);
    assert.equal(second.headers["x-yurbrain-rate-limit-class"], "write_standard");
  } finally {
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WRITE_STANDARD_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_WRITE_STANDARD_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
    else process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("health probes stay unauthenticated standard-read endpoints", async () => {
  const previousLimit = process.env.YURBRAIN_RATE_LIMIT_READ_STANDARD_LIMIT;
  const previousWindow = process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
  resetRateLimitBucketsForTests();
  process.env.YURBRAIN_RATE_LIMIT_READ_STANDARD_LIMIT = "3";
  process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = "60000";
  const dbPath = createDbPath("rate-limit-health-standard-read");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const live = await app.inject({ method: "GET", url: "/health/live" });
    const ready = await app.inject({ method: "GET", url: "/health/ready" });

    assert.equal(live.statusCode, 200);
    assert.equal(ready.statusCode, 200);
    assert.equal(live.headers["x-yurbrain-rate-limit-class"], "read_standard");
    assert.equal(ready.headers["x-yurbrain-rate-limit-class"], "read_standard");
  } finally {
    if (previousLimit === undefined) delete process.env.YURBRAIN_RATE_LIMIT_READ_STANDARD_LIMIT;
    else process.env.YURBRAIN_RATE_LIMIT_READ_STANDARD_LIMIT = previousLimit;
    if (previousWindow === undefined) delete process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS;
    else process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
