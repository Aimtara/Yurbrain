import { LlmProviderError, type LlmProviderErrorCode } from "../ai/provider";

export type LlmFallbackReason = "not_configured" | "timeout" | "provider_error" | "parse_failed";
export type LlmFallbackStage = "grounding" | "invoke" | "parse";

export const FALLBACK_REASON_ORDER: Record<LlmFallbackReason, number> = {
  not_configured: 1,
  timeout: 2,
  parse_failed: 3,
  provider_error: 4
};

type ClassifiedLlmFallback = {
  fallbackReason: LlmFallbackReason;
  fallbackStage: LlmFallbackStage;
  providerErrorCode?: LlmProviderErrorCode;
  errorName?: string;
};

export function toFallbackReason(code: LlmProviderErrorCode): LlmFallbackReason {
  if (code === "not_configured") return "not_configured";
  if (code === "timeout") return "timeout";
  if (code === "invalid_response") return "parse_failed";
  return "provider_error";
}

export function normalizeFallbackReason(reason: LlmFallbackReason | null | undefined): LlmFallbackReason {
  return reason ?? "provider_error";
}

export function classifyLlmFallback(
  error: unknown,
  fallbackStage: LlmFallbackStage = "invoke"
): ClassifiedLlmFallback {
  if (error instanceof LlmProviderError) {
    return {
      fallbackReason: toFallbackReason(error.code),
      fallbackStage,
      providerErrorCode: error.code,
      errorName: error.name
    };
  }

  return {
    fallbackReason: "provider_error",
    fallbackStage,
    errorName: error instanceof Error ? error.name : undefined
  };
}

export function classifyLlmFallbackReason(error: unknown): LlmFallbackReason {
  return classifyLlmFallback(error).fallbackReason;
}
