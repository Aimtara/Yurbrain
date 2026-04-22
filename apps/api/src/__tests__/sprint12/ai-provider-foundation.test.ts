import assert from "node:assert/strict";
import test from "node:test";
import {
  createLlmClient,
  LlmProviderError,
  resolveLlmProviderConfig
} from "../../services/ai/provider";

type MinimalFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

test("resolveLlmProviderConfig returns disabled when provider is off", () => {
  const config = resolveLlmProviderConfig({
    YURBRAIN_LLM_ENABLED: "false"
  });
  assert.equal(config.enabled, false);
  if (!config.enabled) {
    assert.equal(config.reason, "disabled");
  }
});

test("resolveLlmProviderConfig returns disabled when API key is missing", () => {
  const config = resolveLlmProviderConfig({
    YURBRAIN_LLM_ENABLED: "true",
    YURBRAIN_LLM_PROVIDER: "openai"
  });
  assert.equal(config.enabled, false);
  if (!config.enabled) {
    assert.equal(config.reason, "missing_api_key");
  }
});

test("resolveLlmProviderConfig returns enabled config when env is valid", () => {
  const config = resolveLlmProviderConfig({
    YURBRAIN_LLM_ENABLED: "true",
    YURBRAIN_LLM_PROVIDER: "openai",
    YURBRAIN_LLM_API_KEY: "test-key",
    YURBRAIN_LLM_BASE_URL: "https://example.test/v1/",
    YURBRAIN_LLM_MODEL: "gpt-test",
    YURBRAIN_LLM_TIMEOUT_MS: "2500",
    YURBRAIN_LLM_MAX_OUTPUT_TOKENS: "180",
    YURBRAIN_LLM_TEMPERATURE: "0.4"
  });
  assert.equal(config.enabled, true);
  if (config.enabled) {
    assert.equal(config.provider, "openai");
    assert.equal(config.apiKey, "test-key");
    assert.equal(config.baseUrl, "https://example.test/v1");
    assert.equal(config.model, "gpt-test");
    assert.equal(config.timeoutMs, 2500);
    assert.equal(config.maxOutputTokens, 180);
    assert.equal(config.temperature, 0.4);
  }
});

test("createLlmClient not-configured path throws typed error", async () => {
  const client = createLlmClient({
    enabled: false,
    reason: "missing_api_key"
  });

  await assert.rejects(
    () =>
      client.invoke({
        instruction: "Be concise",
        context: "Summarize this"
      }),
    (error: unknown) => {
      assert.ok(error instanceof LlmProviderError);
      assert.equal(error.code, "not_configured");
      return true;
    }
  );
});

test("createLlmClient returns normalized output on success", async () => {
  const client = createLlmClient(
    {
      enabled: true,
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "gpt-test",
      timeoutMs: 500,
      maxOutputTokens: 220,
      temperature: 0.2
    },
    {
      fetchImpl: async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "  concise result  " } }]
          })
        }) as MinimalFetchResponse as Response,
      now: () => 1_000
    }
  );

  const output = await client.invoke({
    instruction: "You are concise.",
    context: "Give one line."
  });

  assert.equal(output.text, "concise result");
  assert.equal(output.provider, "openai");
  assert.equal(output.model, "gpt-test");
  assert.equal(output.latencyMs, 0);
});

test("createLlmClient maps aborted request to timeout error", async () => {
  const client = createLlmClient(
    {
      enabled: true,
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "gpt-test",
      timeoutMs: 1,
      maxOutputTokens: 220,
      temperature: 0.2
    },
    {
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              const abortError = new Error("aborted");
              abortError.name = "AbortError";
              reject(abortError);
            });
          }
        }),
      now: () => 1_000
    }
  );

  await assert.rejects(
    () =>
      client.invoke({
        instruction: "Be concise.",
        context: "Timeout test"
      }),
    (error: unknown) => {
      assert.ok(error instanceof LlmProviderError);
      assert.equal(error.code, "timeout");
      return true;
    }
  );
});

test("createLlmClient rejects invalid provider payload shape", async () => {
  const client = createLlmClient(
    {
      enabled: true,
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "gpt-test",
      timeoutMs: 500,
      maxOutputTokens: 220,
      temperature: 0.2
    },
    {
      fetchImpl: async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ wrong: "shape" })
        }) as MinimalFetchResponse as Response,
      now: () => 1_000
    }
  );

  await assert.rejects(
    () =>
      client.invoke({
        instruction: "Be concise.",
        context: "Invalid payload test"
      }),
    (error: unknown) => {
      assert.ok(error instanceof LlmProviderError);
      assert.equal(error.code, "invalid_response");
      return true;
    }
  );
});
