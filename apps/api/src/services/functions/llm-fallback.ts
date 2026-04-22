import { LlmProviderError, type LlmProviderErrorCode } from "../ai/provider";

export type LlmFallbackReason = "not_configured" | "timeout" | "provider_error" | "parse_failed";
export type LlmFallbackStage = "grounding" | "invoke" | "parse";

type ClassifiedLlmFallback = {
  fallbackReason: LlmFallbackReason;
  providerErrorCode?: LlmProviderErrorCode;
  errorName?: string;
};

export function classifyLlmFallback(error: unknown): ClassifiedLlmFallback {
  if (error instanceof LlmProviderError) {
    if (error.code === "not_configured") {
      return { fallbackReason: "not_configured", providerErrorCode: error.code, errorName: error.name };
    }
    if (error.code === "timeout") {
      return { fallbackReason: "timeout", providerErrorCode: error.code, errorName: error.name };
    }
    if (error.code === "invalid_response") {
      return { fallbackReason: "parse_failed", providerErrorCode: error.code, errorName: error.name };
    }
    return { fallbackReason: "provider_error", providerErrorCode: error.code, errorName: error.name };
  }

  return {
    fallbackReason: "provider_error",
    errorName: error instanceof Error ? error.name : undefined
  };
}
