import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

test("data survives server restart with DB persistence", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", "restart-persistence");
  const userId = "11111111-1111-1111-1111-111111111111";
  const headers = { "x-yurbrain-user-id": userId };
  await rm(dbPath, { recursive: true, force: true });

  const first = createServer({ databasePath: dbPath });
  let createdId = "";

  try {
    const created = await first.app.inject({
      method: "POST",
      url: "/brain-items",
      headers,
      payload: {
        type: "note",
        title: "Persists across restart",
        rawContent: "This item should exist after server restart"
      }
    });

    assert.equal(created.statusCode, 201);
    createdId = created.json<{ id: string }>().id;
  } finally {
    await first.app.close();
  }

  const second = createServer({ databasePath: dbPath });
  try {
    const fetched = await second.app.inject({ method: "GET", url: `/brain-items/${createdId}`, headers });
    assert.equal(fetched.statusCode, 200);
    assert.equal(fetched.json<{ title: string }>().title, "Persists across restart");
  } finally {
    await second.app.close();
  }
});
