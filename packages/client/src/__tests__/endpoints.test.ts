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
