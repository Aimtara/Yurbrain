import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("observability: echoes x-request-id and includes it in validation errors", async () => {
  const requestId = "req-test-observability-1";
  const userId = "71717171-7171-4717-8717-717171717171";
  const response = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: {
      "x-request-id": requestId,
      "x-yurbrain-user-id": userId
    },
    payload: {
      type: "note",
      title: "Invalid request",
      rawContent: ""
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["x-request-id"], requestId);
  const body = response.json<{ requestId?: string; message: string }>();
  assert.equal(body.message, "Validation failed");
  assert.equal(body.requestId, requestId);
});
