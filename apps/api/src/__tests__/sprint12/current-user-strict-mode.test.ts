import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

function createUnsignedJwt(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.`;
}

test("strict identity mode requires bearer identity and ignores header/query fallbacks", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `strict-current-user-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const authUserId = "11111111-1111-4111-8111-111111111111";
  const fallbackUserId = "22222222-2222-4222-8222-222222222222";
  const bearerToken = createUnsignedJwt(authUserId);

  try {
    const strictWithoutBearer = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        "x-yurbrain-identity-mode": "strict",
        "x-yurbrain-user-id": fallbackUserId
      }
    });
    assert.equal(strictWithoutBearer.statusCode, 401);

    const strictWithBearerAndHeader = await server.app.inject({
      method: "GET",
      url: "/auth/me?userId=33333333-3333-4333-8333-333333333333",
      headers: {
        "x-yurbrain-identity-mode": "strict",
        authorization: `Bearer ${bearerToken}`,
        "x-yurbrain-user-id": fallbackUserId
      }
    });
    assert.equal(strictWithBearerAndHeader.statusCode, 200);
    const currentUser = strictWithBearerAndHeader.json<{ id: string; source: string }>();
    assert.equal(currentUser.id, authUserId);
    assert.equal(currentUser.source, "authorization");
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("legacy mode still allows explicit header identity for non-migrated routes", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `legacy-current-user-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const legacyUserId = "11111111-1111-4111-8111-111111111111";
  try {
    const response = await server.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        "x-yurbrain-user-id": legacyUserId
      }
    });
    assert.equal(response.statusCode, 200);
    const currentUser = response.json<{ id: string; source: string }>();
    assert.equal(currentUser.id, legacyUserId);
    assert.equal(currentUser.source, "header");
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
