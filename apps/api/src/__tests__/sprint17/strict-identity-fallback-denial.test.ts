import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createTestJwt } from "../helpers/auth-token";
import { createServer } from "../../server";

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

function strictHeaders(extra: Record<string, string> = {}) {
  return {
    "x-yurbrain-auth-mode": "strict",
    ...extra
  };
}

test("explicit strict mode rejects header fallback without bearer identity", async () => {
  const dbPath = createDbPath("strict-denies-header-fallback");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: strictHeaders({
        "x-yurbrain-user-id": "11111111-1111-4111-8111-111111111111"
      })
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("explicit strict mode rejects query and body userId spoofing without bearer identity", async () => {
  const dbPath = createDbPath("strict-denies-query-body-fallback");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const spoofedUserId = "22222222-2222-4222-8222-222222222222";

  try {
    const querySpoof = await server.app.inject({
      method: "GET",
      url: `/auth/me?userId=${spoofedUserId}`,
      headers: strictHeaders()
    });
    assert.equal(querySpoof.statusCode, 401);

    const bodySpoof = await server.app.inject({
      method: "POST",
      url: "/tasks",
      headers: strictHeaders(),
      payload: {
        userId: spoofedUserId,
        title: "Spoofed task without bearer identity"
      }
    });
    assert.equal(bodySpoof.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("explicit strict mode rejects invalid bearer before considering legacy header fallback", async () => {
  const dbPath = createDbPath("strict-denies-invalid-bearer-fallback");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: strictHeaders({
        authorization: "Bearer not-a-valid-token",
        "x-yurbrain-user-id": "33333333-3333-4333-8333-333333333333"
      })
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("explicit strict mode uses verified bearer identity and ignores spoofed caller userIds", async () => {
  const dbPath = createDbPath("strict-prefers-verified-bearer");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const bearerUserId = "44444444-4444-4444-8444-444444444444";
  const spoofedUserId = "55555555-5555-4555-8555-555555555555";
  const token = await createTestJwt(bearerUserId);

  try {
    const response = await server.app.inject({
      method: "POST",
      url: `/tasks?userId=${spoofedUserId}`,
      headers: strictHeaders({
        authorization: `Bearer ${token}`,
        "x-yurbrain-user-id": spoofedUserId
      }),
      payload: {
        userId: spoofedUserId,
        title: "Bearer-owned strict task"
      }
    });

    assert.equal(response.statusCode, 201);
    const task = response.json<{ userId: string }>();
    assert.equal(task.userId, bearerUserId);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("x-yurbrain-identity-mode strict also disables legacy header fallback", async () => {
  const dbPath = createDbPath("strict-identity-mode-header");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });

  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        "x-yurbrain-identity-mode": "strict",
        "x-yurbrain-user-id": "66666666-6666-4666-8666-666666666666"
      }
    });

    assert.equal(response.statusCode, 401);
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
