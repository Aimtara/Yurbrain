import assert from "node:assert/strict";
import test from "node:test";
import { encodeGroundedAiContext } from "../context";
import { createConfiguredProvider, runAiTask } from "../runner";

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

test("runAiTask uses provider from env when configured", async () => {
  process.env.YURBRAIN_AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.YURBRAIN_OPENAI_MODEL = "gpt-4.1-mini";
  process.env.YURBRAIN_OPENAI_BASE_URL = "https://example.invalid/v1";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "MOCK-TEST next action" } }]
      })
    }) as Response;
  try {
    const result = (await runAiTask({
      task: "query",
      content: "What should I do next?"
    })) as { content: string; metadata?: { source?: string } };
    assert.ok(result.content.startsWith("MOCK-TEST"));
    assert.equal(result.metadata?.source, "openai_provider");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.YURBRAIN_AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.YURBRAIN_OPENAI_MODEL;
    delete process.env.YURBRAIN_OPENAI_BASE_URL;
  }
});

test("createConfiguredProvider falls back to deterministic when provider is disabled", async () => {
  const provider = createConfiguredProvider({ env: {} });
  const result = (await provider.run({
    task: "summarize",
    content: "Fallback provider validation"
  })) as { metadata?: { source?: string } };

  assert.equal(result.metadata?.source, "deterministic_provider");
});

test("createConfiguredProvider uses mock real provider when enabled", async () => {
  const provider = createConfiguredProvider({
    env: {
      YURBRAIN_AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-openai-key",
      YURBRAIN_OPENAI_MODEL: "gpt-4.1-mini",
      YURBRAIN_OPENAI_BASE_URL: "https://example.invalid/v1"
    }
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Configured provider result" } }]
      })
    }) as Response;
  try {
    const result = (await provider.run({
      task: "query",
      content: "Which item should I continue?"
    })) as { metadata?: { source?: string; provider?: string } };
    assert.equal(result.metadata?.source, "openai_provider");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
