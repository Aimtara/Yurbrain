import assert from "node:assert/strict";
import test from "node:test";
import { encodeGroundedAiContext } from "../context";
import { runAiTask } from "../runner";

test("runAiTask returns deterministic summarize output", async () => {
  const result = (await runAiTask({
    task: "summarize",
    content: "Implemented endpoint integration tests"
  })) as { content: string; confidence: number; metadata: { source: string } };

  assert.equal(
    result.content,
    "Changed: Implemented endpoint integration tests. Done: No linked completion signal yet. Blocked: No active blocker signal. Next: Open this item and leave one continuation note."
  );
  assert.equal(result.confidence, 0.76);
  assert.equal(result.metadata.source, "deterministic_provider");
});

test("runAiTask query uses next-action framing when intent is present", async () => {
  const content = encodeGroundedAiContext({
    primaryText: "Any suggestion?",
    context: {
      intent: "next_action",
      recommendation: "Continue feed ranking hardening",
      reason: "It is the highest user-visible risk",
      nextMove: "Add edge-case test for stale tasks"
    }
  });

  const result = (await runAiTask({ task: "query", content })) as { content: string; confidence: number };
  assert.equal(
    result.content,
    "Recommendation: Continue feed ranking hardening. Reason: It is the highest user-visible risk. Next move: Add edge-case test for stale tasks."
  );
  assert.equal(result.confidence, 0.82);
});

test("runAiTask surfaces deterministic invalid payload marker", async () => {
  const result = (await runAiTask({
    task: "classify",
    content: "[force-invalid]"
  })) as { invalid: boolean };

  assert.deepEqual(result, { invalid: true });
});

test("runAiTask rejects on timeout", async () => {
  await assert.rejects(
    () =>
      runAiTask({
        task: "summarize",
        content: "[force-timeout]",
        timeoutMs: 20
      }),
    /AI runner timed out/
  );
});
