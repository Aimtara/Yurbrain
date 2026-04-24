import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createTestJwt } from "../helpers/auth-token";
import { createServer } from "../../server";

test("current user resolution prefers bearer identity and ignores query spoofing", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `strict-current-user-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const authUserId = "11111111-1111-4111-8111-111111111111";
  const fallbackUserId = "22222222-2222-4222-8222-222222222222";
  const bearerToken = await createTestJwt(authUserId);

  try {
    const strictWithBearerAndHeader = await server.app.inject({
      method: "GET",
      url: "/auth/me?userId=33333333-3333-4333-8333-333333333333",
      headers: {
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
