import assert from "node:assert/strict";
import test from "node:test";
import { encodeGroundedAiContext } from "../context";
import { buildClassificationFallback, buildQueryFallback, buildSummaryFallback } from "../fallbacks";

test("buildSummaryFallback uses grounded context fields when available", () => {
  const raw = encodeGroundedAiContext({
    primaryText: "Primary text should be ignored when changed is provided",
    context: {
      changed: "Capture flow now enriches continuity metadata",
      done: "Persistence regression fixed",
      blocked: "Waiting for review",
      nextMove: "Run full test suite"
    }
  });

  const result = buildSummaryFallback(raw);
  assert.equal(
    result.content,
    "Changed: Capture flow now enriches continuity metadata. Done: Persistence regression fixed. Blocked: Waiting for review. Next: Run full test suite."
  );
  assert.equal(result.confidence, 0.4);
  assert.equal(result.metadata.source, "deterministic_fallback");
});

test("buildSummaryFallback uses defaults when context is absent", () => {
  const result = buildSummaryFallback("Raw    note with    extra spacing");
  assert.equal(
    result.content,
    "Changed: Raw note with extra spacing. Done: No linked completion signal yet. Blocked: No active blocker signal. Next: Open this item and leave one continuation note."
  );
});

test("buildClassificationFallback labels questions vs notes", () => {
  assert.equal(buildClassificationFallback("What should I do next?").content, "question");
  assert.equal(buildClassificationFallback("Captured finding from session").content, "note");
});

test("buildQueryFallback uses grounded recommendation context and defaults", () => {
  const grounded = encodeGroundedAiContext({
    primaryText: "What next?",
    context: {
      recommendation: "Finish the API route tests",
      reason: "They are closest to completion",
      nextMove: "Write assertions for unhappy path"
    }
  });

  const groundedResult = buildQueryFallback(grounded);
  assert.equal(
    groundedResult.content,
    "Recommendation: Finish the API route tests. Reason: They are closest to completion. Next move: Write assertions for unhappy path."
  );

  const defaultResult = buildQueryFallback("What should I do?");
  assert.equal(
    defaultResult.content,
    "Recommendation: Continue the clearest open item. Reason: It has the strongest continuity signal right now. Next move: Open it now and complete one 10-minute step."
  );
});
