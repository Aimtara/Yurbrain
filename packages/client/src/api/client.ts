let configuredApiBaseUrl: string | null = null;

declare const process: {
  env?: {
    EXPO_PUBLIC_YURBRAIN_API_URL?: string;
    NEXT_PUBLIC_YURBRAIN_API_URL?: string;
  };
} | undefined;

function trimBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function resolveApiBaseUrl(): string | null {
  if (configuredApiBaseUrl) return configuredApiBaseUrl;
  if (typeof globalThis !== "undefined") {
    const globalBase = (globalThis as { __YURBRAIN_API_BASE_URL?: unknown }).__YURBRAIN_API_BASE_URL;
    if (typeof globalBase === "string") {
      const normalized = trimBaseUrl(globalBase);
      if (normalized) return normalized;
    }
  }
  if (typeof process !== "undefined" && process.env) {
    const envBase = process.env.EXPO_PUBLIC_YURBRAIN_API_URL ?? process.env.NEXT_PUBLIC_YURBRAIN_API_URL;
    const normalized = trimBaseUrl(envBase);
    if (normalized) return normalized;
  }
  return null;
}

function resolveRequestPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function configureApiBaseUrl(baseUrl: string | null | undefined) {
  configuredApiBaseUrl = trimBaseUrl(baseUrl);
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveRequestPath(path), init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
