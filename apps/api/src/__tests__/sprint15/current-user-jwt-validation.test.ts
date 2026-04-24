import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { TEST_JWT_AUDIENCE, TEST_JWT_ISSUER, createTestJwt } from "../helpers/auth-token";
import { createServer } from "../../server";

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function createUnsignedJwt(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8").toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iss: TEST_JWT_ISSUER,
      aud: TEST_JWT_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 60,
      "https://hasura.io/jwt/claims": {
        "x-hasura-user-id": userId,
        "x-hasura-default-role": "user",
        "x-hasura-allowed-roles": ["user"]
      }
    }),
    "utf8"
  ).toString("base64url");
  return `${header}.${payload}.`;
}

function forgeTokenSubject(token: string, forgedUserId: string): string {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Token must contain exactly three segments.");
  }
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as Record<string, unknown>;
  payload.sub = forgedUserId;
  payload["https://hasura.io/jwt/claims"] = {
    "x-hasura-user-id": forgedUserId,
    "x-hasura-default-role": "user",
    "x-hasura-allowed-roles": ["user"]
  };
  const forgedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${headerSegment}.${forgedPayload}.${signatureSegment}`;
}

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

test("auth accepts a valid signed bearer token", async () => {
  const dbPath = createDbPath("jwt-auth-valid");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "90909090-9090-4090-8090-909090909090";

  try {
    const token = await createTestJwt(userId);
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(token)
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ id: string; source: string }>(), {
      id: userId,
      source: "authorization"
    });
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("auth rejects missing bearer token", async () => {
  const dbPath = createDbPath("jwt-auth-missing");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me"
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("auth rejects expired bearer token", async () => {
  const dbPath = createDbPath("jwt-auth-expired");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "91919191-9191-4191-8191-919191919191";

  try {
    const expiredToken = await createTestJwt(userId, { expiresInSeconds: -60 });
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(expiredToken)
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("auth rejects forged bearer token", async () => {
  const dbPath = createDbPath("jwt-auth-forged");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const signerUserId = "92929292-9292-4292-8292-929292929292";
  const attackerUserId = "93939393-9393-4393-8393-939393939393";

  try {
    const validToken = await createTestJwt(signerUserId);
    const forgedToken = forgeTokenSubject(validToken, attackerUserId);
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(forgedToken)
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("auth rejects unsigned, malformed, wrong-issuer, and wrong-audience tokens", async () => {
  const dbPath = createDbPath("jwt-auth-invalid-forms");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "94949494-9494-4494-8494-949494949494";

  try {
    const unsignedToken = createUnsignedJwt(userId);
    const wrongIssuerToken = await createTestJwt(userId, { issuer: "https://wrong-issuer.example/v1" });
    const wrongAudienceToken = await createTestJwt(userId, { audience: "wrong-audience" });

    const malformedResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders("not-a-jwt")
    });
    assert.equal(malformedResponse.statusCode, 401);

    const unsignedResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(unsignedToken)
    });
    assert.equal(unsignedResponse.statusCode, 401);

    const wrongIssuerResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(wrongIssuerToken)
    });
    assert.equal(wrongIssuerResponse.statusCode, 401);

    const wrongAudienceResponse = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: authHeaders(wrongAudienceToken)
    });
    assert.equal(wrongAudienceResponse.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("owner checks still block wrong-user access even with valid JWTs", async () => {
  const dbPath = createDbPath("jwt-auth-cross-user");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const ownerUserId = "95959595-9595-4595-8595-959595959595";
  const outsiderUserId = "96969696-9696-4696-8696-969696969696";

  try {
    const ownerToken = await createTestJwt(ownerUserId);
    const outsiderToken = await createTestJwt(outsiderUserId);

    const createTask = await server.app.inject({
      method: "POST",
      url: "/tasks",
      headers: authHeaders(ownerToken),
      payload: { title: "Private owner task" }
    });
    assert.equal(createTask.statusCode, 201);
    const task = createTask.json<{ id: string }>();

    const outsiderRead = await server.app.inject({
      method: "GET",
      url: `/tasks/${task.id}`,
      headers: authHeaders(outsiderToken)
    });
    assert.equal(outsiderRead.statusCode, 404);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("x-yurbrain-user-id header is rejected when strict auth fallback is disabled", async () => {
  const previousValue = process.env.YURBRAIN_ALLOW_TEST_USER_HEADER;
  process.env.YURBRAIN_ALLOW_TEST_USER_HEADER = "0";
  const dbPath = createDbPath("jwt-auth-header-disabled");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "97979797-9797-4797-8797-979797979797";

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { "x-yurbrain-user-id": userId }
    });
    assert.equal(response.statusCode, 401);
  } finally {
    if (previousValue === undefined) {
      delete process.env.YURBRAIN_ALLOW_TEST_USER_HEADER;
    } else {
      process.env.YURBRAIN_ALLOW_TEST_USER_HEADER = previousValue;
    }
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("x-yurbrain-user-id header is always rejected in production mode", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousTestMode = process.env.YURBRAIN_TEST_MODE;
  const previousHeaderOverride = process.env.YURBRAIN_ALLOW_TEST_USER_HEADER;
  process.env.NODE_ENV = "production";
  delete process.env.YURBRAIN_TEST_MODE;
  process.env.YURBRAIN_ALLOW_TEST_USER_HEADER = "1";
  const dbPath = createDbPath("jwt-auth-header-production");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const userId = "98989898-9898-4898-8898-989898989898";

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { "x-yurbrain-user-id": userId }
    });
    assert.equal(response.statusCode, 401);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousTestMode === undefined) {
      delete process.env.YURBRAIN_TEST_MODE;
    } else {
      process.env.YURBRAIN_TEST_MODE = previousTestMode;
    }
    if (previousHeaderOverride === undefined) {
      delete process.env.YURBRAIN_ALLOW_TEST_USER_HEADER;
    } else {
      process.env.YURBRAIN_ALLOW_TEST_USER_HEADER = previousHeaderOverride;
    }
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
