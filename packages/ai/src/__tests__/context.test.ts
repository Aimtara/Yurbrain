import assert from "node:assert/strict";
import test from "node:test";
import { decodeGroundedAiContext, encodeGroundedAiContext } from "../context";

test("encodeGroundedAiContext and decodeGroundedAiContext round-trip valid payload", () => {
  const encoded = encodeGroundedAiContext({
    primaryText: "Ship sprint slice",
    context: { done: "Implemented tests", nextMove: "Run CI" }
  });

  const decoded = decodeGroundedAiContext(encoded);
  assert.deepEqual(decoded, {
    primaryText: "Ship sprint slice",
    context: { done: "Implemented tests", nextMove: "Run CI" }
  });
});

test("decodeGroundedAiContext rejects non-prefixed and malformed values", () => {
  assert.equal(decodeGroundedAiContext("hello"), null);
  assert.equal(decodeGroundedAiContext("YURBRAIN_CONTEXT::{"), null);
});

test("decodeGroundedAiContext rejects invalid shape", () => {
  const invalidPrimary = "YURBRAIN_CONTEXT::" + JSON.stringify({ primaryText: 7, context: {} });
  const invalidContext = "YURBRAIN_CONTEXT::" + JSON.stringify({ primaryText: "ok", context: [] });

  assert.equal(decodeGroundedAiContext(invalidPrimary), null);
  assert.equal(decodeGroundedAiContext(invalidContext), null);
});
