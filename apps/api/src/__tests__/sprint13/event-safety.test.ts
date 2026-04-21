import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

const founderReviewUserId = "11111111-1111-1111-1111-111111111111";

test.after(async () => {
  await app.close();
});

test("GET /events stays blocked from public access", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/events",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 403);
  const body = response.json<{ message: string }>();
  assert.match(body.message, /disabled/i);
});

test("founder diagnostics response excludes raw event payloads", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review/diagnostics?window=7d",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<Record<string, unknown>>();
  assert.equal("events" in body, false);
  assert.ok(Array.isArray(body.focusItems));
  assert.ok(Array.isArray(body.focusActions));
});
