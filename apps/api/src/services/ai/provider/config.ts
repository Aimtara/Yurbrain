const DEFAULT_PROVIDER = "openai" as const;
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 1_800;
const DEFAULT_MAX_OUTPUT_TOKENS = 220;
const DEFAULT_TEMPERATURE = 0.2;

export type LlmProviderName = "openai";
export type LlmTaskClass = "default" | "summarize_progress" | "next_step" | "classification";

export type LlmProviderConfig =
  | {
      enabled: false;
      reason: "disabled" | "missing_provider" | "missing_api_key";
    }
  | {
      enabled: true;
      provider: LlmProviderName;
      apiKey: string;
      baseUrl: string;
      model: string;
      fastModel: string;
      reasoningModel: string;
      taskModels: Partial<Record<LlmTaskClass, string>>;
      timeoutMs: number;
      maxOutputTokens: number;
      temperature: number;
    };

export type LlmEnv = Record<string, string | undefined>;

function normalizeString(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = normalizeString(value);
  if (!normalized) return defaultValue;
  const lower = normalized.toLowerCase();
  if (lower === "1" || lower === "true" || lower === "yes" || lower === "on") return true;
  if (lower === "0" || lower === "false" || lower === "no" || lower === "off") return false;
  return defaultValue;
}

function parseNumber(value: string | undefined, defaultValue: number, min: number, max: number): number {
  const normalized = normalizeString(value);
  if (!normalized) return defaultValue;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function parseProvider(value: string | undefined): LlmProviderName | null {
  const normalized = normalizeString(value);
  if (!normalized) return DEFAULT_PROVIDER;
  if (normalized.toLowerCase() === "openai") return "openai";
  return null;
}

function normalizeBaseUrl(value: string | undefined): string {
  const normalized = normalizeString(value) ?? DEFAULT_OPENAI_BASE_URL;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function resolveLlmModelForTask(
  config: Extract<LlmProviderConfig, { enabled: true }>,
  taskClass: LlmTaskClass = "default",
  modelOverride?: string
): string {
  const requested = normalizeString(modelOverride);
  if (requested) return requested;
  const taskModel = config.taskModels[taskClass];
  if (taskModel) return taskModel;
  if (taskClass === "summarize_progress" || taskClass === "classification") return config.fastModel;
  if (taskClass === "next_step") return config.reasoningModel;
  return config.model;
}

export function resolveLlmProviderConfig(env: LlmEnv = process.env): LlmProviderConfig {
  const enabled = parseBoolean(env.YURBRAIN_LLM_ENABLED, true);
  if (!enabled) {
    return {
      enabled: false,
      reason: "disabled"
    };
  }

  const provider = parseProvider(env.YURBRAIN_LLM_PROVIDER);
  if (!provider) {
    return {
      enabled: false,
      reason: "missing_provider"
    };
  }

  const apiKey = normalizeString(env.YURBRAIN_LLM_API_KEY);
  if (!apiKey) {
    return {
      enabled: false,
      reason: "missing_api_key"
    };
  }

  const model = normalizeString(env.YURBRAIN_LLM_MODEL) ?? DEFAULT_OPENAI_MODEL;
  const fastModel = normalizeString(env.YURBRAIN_LLM_FAST_MODEL) ?? model;
  const reasoningModel = normalizeString(env.YURBRAIN_LLM_REASONING_MODEL) ?? model;

  return {
    enabled: true,
    provider,
    apiKey,
    baseUrl: normalizeBaseUrl(env.YURBRAIN_LLM_BASE_URL),
    model,
    fastModel,
    reasoningModel,
    taskModels: {
      default: normalizeString(env.YURBRAIN_LLM_DEFAULT_MODEL) ?? model,
      summarize_progress: normalizeString(env.YURBRAIN_LLM_SUMMARIZE_PROGRESS_MODEL) ?? fastModel,
      next_step: normalizeString(env.YURBRAIN_LLM_NEXT_STEP_MODEL) ?? reasoningModel,
      classification: normalizeString(env.YURBRAIN_LLM_CLASSIFICATION_MODEL) ?? fastModel
    },
    timeoutMs: parseNumber(env.YURBRAIN_LLM_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 100, 30_000),
    maxOutputTokens: parseNumber(env.YURBRAIN_LLM_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS, 32, 1_024),
    temperature: parseNumber(env.YURBRAIN_LLM_TEMPERATURE, DEFAULT_TEMPERATURE, 0, 1)
  };
}
