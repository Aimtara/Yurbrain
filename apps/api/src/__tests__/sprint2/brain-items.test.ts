import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("brain-item CRUD + validation error mapping", async () => {
  const invalidCreate = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId: "not-a-uuid",
      type: "note",
      title: "Test",
      rawContent: "Body"
    }
  });

  assert.equal(invalidCreate.statusCode, 400);

  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId: "11111111-1111-1111-1111-111111111111",
      type: "note",
      title: "Sprint 2",
      rawContent: "Deterministic loop"
    }
  });

  assert.equal(created.statusCode, 201);
  const item = created.json<{ id: string; title: string }>();

  const fetched = await app.inject({ method: "GET", url: `/brain-items/${item.id}` });
  assert.equal(fetched.statusCode, 200);
  assert.equal(fetched.json<{ title: string }>().title, "Sprint 2");

  const updated = await app.inject({
    method: "PATCH",
    url: `/brain-items/${item.id}`,
    payload: {
      title: "Sprint 2 updated",
      execution: {
        status: "planned",
        priority: "normal",
        nextStep: "Open and convert this into one task."
      }
    }
  });

  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json<{ title: string }>().title, "Sprint 2 updated");
  const updatedBody = updated.json<{ execution?: { status: string; nextStep?: string } }>();
  assert.equal(updatedBody.execution?.status, "planned");
  assert.equal(updatedBody.execution?.nextStep, "Open and convert this into one task.");
});
