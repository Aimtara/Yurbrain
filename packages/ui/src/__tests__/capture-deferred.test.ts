import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("capture composer keeps production-deferred storage affordances non-interactive", () => {
  const source = readFileSync(path.resolve("src/components/capture/CaptureComposer.tsx"), "utf8");

  assert.match(source, /productionMode\?: boolean/);
  assert.match(source, /productionMode \? null :/);
  assert.match(source, /native uploads are not part of the current production scope/);
  assert.match(source, /Voice capture \(post-alpha\)/);
  assert.match(source, /Reminder scheduling \(post-alpha\)/);
  assert.doesNotMatch(source, /type="file"/);
});
