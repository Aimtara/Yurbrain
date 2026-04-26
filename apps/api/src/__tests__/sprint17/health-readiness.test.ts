import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

test("health endpoints distinguish liveness and readiness without authentication", async () => {
  const dbPath = createDbPath("health-readiness");
  await rm(dbPath, { recursive: true, force: true });
  const { app } = createServer({ databasePath: dbPath });

  try {
    const live = await app.inject({ method: "GET", url: "/health/live" });
    assert.equal(live.statusCode, 200);
    assert.deepEqual(live.json(), {
      status: "ok",
      check: "live",
      service: "api"
    });

    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    assert.equal(ready.statusCode, 200);
    assert.deepEqual(ready.json(), {
      status: "ok",
      check: "ready",
      service: "api",
      dependencies: {
        database: "ok"
      }
    });
  } finally {
    await app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
