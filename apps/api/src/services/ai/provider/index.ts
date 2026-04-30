import { createLlmClient, type LlmClient, type LlmInvocationInput, type LlmInvocationOutput, LlmProviderError } from "./client";
import { resolveLlmModelForTask, resolveLlmProviderConfig, type LlmProviderConfig } from "./config";

export type { LlmProviderConfig, LlmProviderName, LlmTaskClass } from "./config";
export { resolveLlmModelForTask, resolveLlmProviderConfig };
export type { LlmClient, LlmInvocationInput, LlmInvocationOutput, LlmProviderErrorCode } from "./client";
export { createLlmClient, LlmProviderError };

let cachedConfig: LlmProviderConfig | null = null;
let cachedClient: LlmClient | null = null;
let customConfigResolver: (() => LlmProviderConfig) | null = null;

export function getLlmProviderConfig(): LlmProviderConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = customConfigResolver ? customConfigResolver() : resolveLlmProviderConfig();
  return cachedConfig;
}

export function getLlmClient(): LlmClient {
  if (cachedClient) return cachedClient;
  cachedClient = createLlmClient(getLlmProviderConfig());
  return cachedClient;
}

export async function invokeLlm(input: LlmInvocationInput): Promise<LlmInvocationOutput> {
  return getLlmClient().invoke(input);
}

export function resetLlmProviderCacheForTests(): void {
  cachedConfig = null;
  cachedClient = null;
}

export function setLlmProviderConfigResolverForTests(resolver: (() => LlmProviderConfig) | null): void {
  customConfigResolver = resolver;
  resetLlmProviderCacheForTests();
}
