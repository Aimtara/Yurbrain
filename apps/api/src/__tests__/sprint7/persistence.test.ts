import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

test("data survives server restart with DB persistence", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", "restart-persistence");
  await rm(dbPath, { recursive: true, force: true });

  const first = createServer({ databasePath: dbPath });
  let createdId = "";

  try {
    const created = await first.app.inject({
      method: "POST",
      url: "/brain-items",
      payload: {
        userId: "11111111-1111-1111-1111-111111111111",
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
    const fetched = await second.app.inject({ method: "GET", url: `/brain-items/${createdId}` });
    assert.equal(fetched.statusCode, 200);
    assert.equal(fetched.json<{ title: string }>().title, "Persists across restart");
  } finally {
    await second.app.close();
  }
});

test("execution metadata and preference persistence survive server restart", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", "restart-execution-persistence");
  await rm(dbPath, { recursive: true, force: true });
  const userId = "71717171-7171-4717-8717-717171717171";

  const first = createServer({ databasePath: dbPath });
  let createdId = "";

  try {
    const created = await first.app.inject({
      method: "POST",
      url: "/brain-items",
      payload: {
        userId,
        type: "note",
        title: "Execution metadata survives restart",
        rawContent: "Persistence check for execution metadata."
      }
    });
    assert.equal(created.statusCode, 201);
    createdId = created.json<{ id: string }>().id;

    const patched = await first.app.inject({
      method: "PATCH",
      url: `/brain-items/${createdId}`,
      payload: {
        execution: {
          status: "planned",
          priority: "normal",
          nextStep: "Run the persistence check after restart."
        }
      }
    });
    assert.equal(patched.statusCode, 200);

    const preferenceUpdated = await first.app.inject({
      method: "PUT",
      url: `/preferences/${userId}`,
      payload: {
        defaultLens: "in_progress",
        founderMode: true
      }
    });
    assert.equal(preferenceUpdated.statusCode, 200);
  } finally {
    await first.app.close();
  }

  const second = createServer({ databasePath: dbPath });
  try {
    const fetched = await second.app.inject({ method: "GET", url: `/brain-items/${createdId}` });
    assert.equal(fetched.statusCode, 200);
    const fetchedBody = fetched.json<{ execution?: { status: string; nextStep?: string } }>();
    assert.equal(fetchedBody.execution?.status, "planned");
    assert.equal(fetchedBody.execution?.nextStep, "Run the persistence check after restart.");

    const preferenceFetched = await second.app.inject({ method: "GET", url: `/preferences/${userId}` });
    assert.equal(preferenceFetched.statusCode, 200);
    const preferenceBody = preferenceFetched.json<{ defaultLens: string; founderMode: boolean }>();
    assert.equal(preferenceBody.defaultLens, "in_progress");
    assert.equal(preferenceBody.founderMode, true);
  } finally {
    await second.app.close();
  }
});
