let configuredApiBaseUrl: string | null = null;
let configuredCurrentUserId: string | null = null;
const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const CURRENT_USER_STORAGE_KEY = "yurbrain.currentUserId";
const GLOBAL_CURRENT_USER_KEY = "__YURBRAIN_CURRENT_USER_ID";

declare const process: {
  env?: {
    EXPO_PUBLIC_YURBRAIN_API_URL?: string;
    NEXT_PUBLIC_YURBRAIN_API_URL?: string;
    EXPO_PUBLIC_YURBRAIN_USER_ID?: string;
    NEXT_PUBLIC_YURBRAIN_USER_ID?: string;
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

function trimUserId(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function configureCurrentUserId(userId: string | null | undefined) {
  configuredCurrentUserId = trimUserId(userId);
}

export function getConfiguredCurrentUserId(): string | null {
  return ensureCurrentUserId();
}

function readStoredCurrentUserId(): string | null {
  if (typeof globalThis === "undefined") return null;
  const storage = (globalThis as { localStorage?: { getItem: (key: string) => string | null } }).localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return trimUserId(storage.getItem(CURRENT_USER_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredCurrentUserId(userId: string): void {
  if (typeof globalThis === "undefined") return;
  const storage = (globalThis as { localStorage?: { setItem: (key: string, value: string) => void } }).localStorage;
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(CURRENT_USER_STORAGE_KEY, userId);
  } catch {
    // Best-effort only.
  }
}

function readGlobalCurrentUserId(): string | null {
  if (typeof globalThis === "undefined") return null;
  return trimUserId((globalThis as Record<string, unknown>)[GLOBAL_CURRENT_USER_KEY] as string | undefined);
}

function writeGlobalCurrentUserId(userId: string): void {
  if (typeof globalThis === "undefined") return;
  (globalThis as Record<string, unknown>)[GLOBAL_CURRENT_USER_KEY] = userId;
}

function readEnvCurrentUserId(): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  return trimUserId(process.env.NEXT_PUBLIC_YURBRAIN_USER_ID ?? process.env.EXPO_PUBLIC_YURBRAIN_USER_ID ?? null);
}

function generateRuntimeCurrentUserId(): string | null {
  if (typeof globalThis === "undefined") return null;
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!cryptoApi || typeof cryptoApi.randomUUID !== "function") return null;
  return trimUserId(cryptoApi.randomUUID());
}

function ensureCurrentUserId(): string | null {
  if (configuredCurrentUserId) return configuredCurrentUserId;
  const resolved = readGlobalCurrentUserId() ?? readStoredCurrentUserId() ?? readEnvCurrentUserId() ?? generateRuntimeCurrentUserId();
  configuredCurrentUserId = trimUserId(resolved);
  if (configuredCurrentUserId) {
    writeGlobalCurrentUserId(configuredCurrentUserId);
    writeStoredCurrentUserId(configuredCurrentUserId);
  }
  return configuredCurrentUserId;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const currentUserId = ensureCurrentUserId();
  if (currentUserId && !headers.has(CURRENT_USER_HEADER)) {
    headers.set(CURRENT_USER_HEADER, currentUserId);
  }

  const response = await fetch(resolveRequestPath(path), {
    ...init,
    headers
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
