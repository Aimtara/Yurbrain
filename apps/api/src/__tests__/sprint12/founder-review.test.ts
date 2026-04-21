import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

const founderReviewUserId = "11111111-1111-1111-1111-111111111111";

test.after(async () => {
  await app.close();
});

test("GET /functions/founder-review returns a UI-ready deterministic model", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review?window=7d",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<{
    window: string;
    overview: { overallProduct: { score: number }; web: { score: number }; mobile: { score: number }; crossPlatform: { score: number } };
    loopHealth: Array<{ key: string; score: number; action: { target: string } }>;
    riskFlags: Array<{ id: string; severity: string; action: { target: string } }>;
    founderExecutionSummary: { activeWork: number; blocked: number; stale: number };
    currentReadout: { recommendedNextMove: { action: { target: string } } };
  }>();

  assert.equal(body.window, "7d");
  assert.equal(body.loopHealth.length, 6);
  assert.ok(body.overview.overallProduct.score >= 0 && body.overview.overallProduct.score <= 100);
  assert.ok(body.overview.web.score >= 0 && body.overview.web.score <= 100);
  assert.ok(body.overview.mobile.score >= 0 && body.overview.mobile.score <= 100);
  assert.ok(body.overview.crossPlatform.score >= 0 && body.overview.crossPlatform.score <= 100);
  assert.ok(body.loopHealth.every((entry) => entry.action.target === "feed" || entry.action.target === "item"));
  assert.ok(body.riskFlags.every((flag) => flag.action.target === "feed" || flag.action.target === "item"));
  assert.ok(body.founderExecutionSummary.activeWork >= 0);
  assert.ok(body.founderExecutionSummary.blocked >= 0);
  assert.ok(body.founderExecutionSummary.stale >= 0);
  assert.ok(body.currentReadout.recommendedNextMove.action.target === "feed" || body.currentReadout.recommendedNextMove.action.target === "item");
});

test("GET /functions/founder-review with ai wording adds concise explanatory copy", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review?window=7d&includeAi=1",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<{
    aiReadout?: {
      summary: string;
      recommendedNextMoveWording: string;
      groundingNote: string;
    };
  }>();

  assert.ok(body.aiReadout);
  assert.ok((body.aiReadout?.summary.length ?? 0) > 0);
  assert.ok((body.aiReadout?.recommendedNextMoveWording.length ?? 0) > 0);
  assert.ok((body.aiReadout?.groundingNote.length ?? 0) > 0);
});

test("GET /functions/founder-review accepts bearer JWT subject for identity", async () => {
  const jwtPayload = Buffer.from(
    JSON.stringify({ sub: founderReviewUserId }),
    "utf8"
  ).toString("base64url");
  const bearerToken = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${jwtPayload}.sig`;

  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review?window=7d",
    headers: { authorization: `Bearer ${bearerToken}` }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<{ window: string }>();
  assert.equal(body.window, "7d");
});

test("GET /functions/founder-review/diagnostics is owner-scoped and returns compact diagnostics", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/functions/founder-review/diagnostics?window=7d",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json<{
    strongestKeywords: string[];
    latestItemTitles: string[];
    itemCount: number;
    taskCount: number;
    sessionCount: number;
  }>();
  assert.ok(Array.isArray(body.strongestKeywords));
  assert.ok(Array.isArray(body.latestItemTitles));
  assert.equal(typeof body.itemCount, "number");
  assert.equal(typeof body.taskCount, "number");
  assert.equal(typeof body.sessionCount, "number");
});

test("GET /founder-review stays as compatibility route and emits deprecation header", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/founder-review?window=7d",
    headers: { "x-yurbrain-user-id": founderReviewUserId }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-yurbrain-route-compat"], "legacy-founder-review");
});
