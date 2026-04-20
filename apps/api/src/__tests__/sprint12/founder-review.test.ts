import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("GET /founder-review returns a UI-ready deterministic model", async () => {
  const userId = "8a8a8a8a-8a8a-4a8a-8a8a-8a8a8a8a8a8a";
  const response = await app.inject({
    method: "GET",
    url: "/founder-review?window=7d",
    headers: { "x-yurbrain-user-id": userId }
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

test("GET /founder-review with ai wording adds concise explanatory copy", async () => {
  const userId = "8b8b8b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b";
  const response = await app.inject({
    method: "GET",
    url: "/founder-review?window=7d&includeAi=1",
    headers: { "x-yurbrain-user-id": userId }
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

test("GET /founder-review rejects unauthenticated requests outside test fallback mode", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTestMode = process.env.YURBRAIN_TEST_MODE;
  process.env.NODE_ENV = "development";
  delete process.env.YURBRAIN_TEST_MODE;
  const response = await app.inject({
    method: "GET",
    url: "/founder-review?window=7d"
  });
  process.env.NODE_ENV = originalNodeEnv;
  if (originalTestMode === undefined) {
    delete process.env.YURBRAIN_TEST_MODE;
  } else {
    process.env.YURBRAIN_TEST_MODE = originalTestMode;
  }
  assert.equal(response.statusCode, 401);
});
