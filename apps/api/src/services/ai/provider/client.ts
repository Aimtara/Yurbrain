import { z } from "zod";
import type { LlmProviderConfig } from "./config";

const OpenAiChatCompletionResponseSchema = z
  .object({
    choices: z
      .array(
        z.object({
          message: z.object({
            content: z.string().nullable().optional()
          })
        })
      )
      .min(1)
  })
  .strict();

export type LlmInvocationInput = {
  instruction: string;
  context: string;
  taskClass?: LlmTaskClass;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
};

export type LlmInvocationOutput = {
  text: string;
  provider: "openai";
  model: string;
  latencyMs: number;
};

export type LlmProviderErrorCode =
  | "not_configured"
  | "timeout"
  | "provider_error"
  | "invalid_response";

export class LlmProviderError extends Error {
  readonly code: LlmProviderErrorCode;

  constructor(code: LlmProviderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type LlmClient = {
  invoke: (input: LlmInvocationInput) => Promise<LlmInvocationOutput>;
};

type OpenAiChatRequestBody = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
};

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function bounded(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function buildRequestBody(
  config: Extract<LlmProviderConfig, { enabled: true }>,
  input: LlmInvocationInput
): OpenAiChatRequestBody {
  const instruction = compact(input.instruction);
  const context = compact(input.context);
  const model = input.model ?? resolveModelForTaskClass(config, input.taskClass);
  return {
    model,
    temperature: input.temperature ?? config.temperature,
    max_tokens: input.maxOutputTokens ?? config.maxOutputTokens,
    messages: [
      {
        role: "system",
        content: instruction
      },
      {
        role: "user",
        content: context
      }
    ]
  };
}

type InvokeOpenAiClientDeps = {
  fetchImpl: typeof fetch;
  now: () => number;
};

async function invokeOpenAi(
  config: Extract<LlmProviderConfig, { enabled: true }>,
  input: LlmInvocationInput,
  deps: InvokeOpenAiClientDeps
): Promise<LlmInvocationOutput> {
  const startedAt = deps.now();
  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? config.timeoutMs;
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await deps.fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(buildRequestBody(config, input)),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new LlmProviderError("provider_error", `Provider request failed (${response.status})`);
    }

    const json = await response.json();
    const parsed = OpenAiChatCompletionResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new LlmProviderError("invalid_response", "Provider response shape was invalid");
    }

    const rawContent = parsed.data.choices[0]?.message.content;
    const content = typeof rawContent === "string" ? compact(rawContent) : "";
    if (content.length === 0) {
      throw new LlmProviderError("invalid_response", "Provider returned empty content");
    }

    return {
      text: bounded(content, 1_200),
      provider: "openai",
      model: input.model ?? resolveModelForTaskClass(config, input.taskClass),
      latencyMs: Math.max(0, deps.now() - startedAt)
    };
  } catch (error) {
    if (error instanceof LlmProviderError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmProviderError("timeout", `Provider request timed out after ${timeoutMs}ms`);
    }
    throw new LlmProviderError("provider_error", "Provider request failed");
  } finally {
    clearTimeout(timeoutTimer);
    controller.abort();
  }
}

type CreateLlmClientDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export function createLlmClient(config: LlmProviderConfig, deps: CreateLlmClientDeps = {}): LlmClient {
  if (!config.enabled) {
    return {
      async invoke() {
        throw new LlmProviderError("not_configured", `LLM provider is unavailable (${config.reason})`);
      }
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  if (config.provider === "openai") {
    return {
      invoke: (input) => invokeOpenAi(config, input, { fetchImpl, now })
    };
  }

  return {
    async invoke() {
      throw new LlmProviderError("not_configured", "LLM provider is unavailable (unsupported provider)");
    }
  };
}
