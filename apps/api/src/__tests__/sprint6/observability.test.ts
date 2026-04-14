import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("observability: echoes x-request-id and includes it in validation errors", async () => {
  const requestId = "req-test-observability-1";
  const response = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: {
      "x-request-id": requestId
    },
    payload: {
      userId: "not-a-uuid",
      type: "idea",
      title: "Invalid request",
      rawContent: "Will fail validation"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["x-request-id"], requestId);
  const body = response.json<{ requestId?: string; message: string }>();
  assert.equal(body.message, "Validation failed");
  assert.equal(body.requestId, requestId);
});
