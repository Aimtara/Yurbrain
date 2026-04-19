import assert from "node:assert/strict";
import test from "node:test";
import { validateAiEnvelope } from "../validate";

test("validateAiEnvelope accepts valid payload and applies metadata default", () => {
  const parsed = validateAiEnvelope({
    content: "Grounded summary",
    confidence: 0.75
  });

  assert.equal(parsed.content, "Grounded summary");
  assert.equal(parsed.confidence, 0.75);
  assert.deepEqual(parsed.metadata, {});
});

test("validateAiEnvelope rejects invalid envelopes", () => {
  assert.throws(() => validateAiEnvelope({ content: "", confidence: 0.5 }));
  assert.throws(() => validateAiEnvelope({ content: "ok", confidence: 2 }));
  assert.throws(() => validateAiEnvelope({ content: "ok", confidence: 0.4, extra: true }));
});
