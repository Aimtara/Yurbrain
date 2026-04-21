import assert from "node:assert/strict";
import test from "node:test";
import { endpoints } from "../api/endpoints";

test("endpoints constants are leading-slash paths", () => {
  for (const [name, path] of Object.entries(endpoints)) {
    assert.ok(path.startsWith("/"), `${name} should start with "/"`);
    assert.ok(!path.endsWith("/"), `${name} should not end with "/"`);
  }
});

test("endpoints cover the documented core loop surface", () => {
  const required = [
    "captureIntake",
    "brainItems",
    "feed",
    "threads",
    "messages",
    "preferences",
    "tasks",
    "sessions",
    "manualConvertTask",
    "aiSummarize",
    "aiSummarizeCluster",
    "aiClassify",
    "aiQuery",
    "aiNextStep",
    "aiConvert"
  ] as const;

  for (const key of required) {
    assert.ok(key in endpoints, `missing endpoint entry: ${key}`);
  }
});

test("function endpoint aliases resolve to canonical paths", () => {
  assert.equal(endpoints.functionFeed, "/functions/feed");
  assert.equal(endpoints.functionFeedRank, endpoints.functionFeed);
  assert.equal(endpoints.functionNextStep, "/functions/what-should-i-do-next");
  assert.equal(endpoints.functionFounderReview, "/functions/founder-review");
  assert.equal(endpoints.functionFounderReviewDiagnostics, "/functions/founder-review/diagnostics");
  assert.equal(endpoints.functionSummarizeItem, "/functions/summarize");
  assert.equal(endpoints.functionClassifyItem, "/functions/classify");
  assert.equal(endpoints.functionQueryItem, "/functions/query");
  assert.equal(endpoints.functionConvert, "/functions/convert");
});
