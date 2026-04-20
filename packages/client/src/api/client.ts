let configuredApiBaseUrl: string | null = null;
let configuredCurrentUserId: string | null = null;
let configuredAccessToken: string | null = null;
const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const AUTHORIZATION_HEADER = "authorization";
const CURRENT_USER_STORAGE_KEY = "yurbrain.currentUserId";
const ACCESS_TOKEN_STORAGE_KEY = "yurbrain.accessToken";
const GLOBAL_CURRENT_USER_KEY = "__YURBRAIN_CURRENT_USER_ID";
const GLOBAL_ACCESS_TOKEN_KEY = "__YURBRAIN_ACCESS_TOKEN";

declare const process: {
  env?: {
    EXPO_PUBLIC_YURBRAIN_API_URL?: string;
    NEXT_PUBLIC_YURBRAIN_API_URL?: string;
    EXPO_PUBLIC_YURBRAIN_USER_ID?: string;
    NEXT_PUBLIC_YURBRAIN_USER_ID?: string;
    EXPO_PUBLIC_YURBRAIN_ACCESS_TOKEN?: string;
    NEXT_PUBLIC_YURBRAIN_ACCESS_TOKEN?: string;
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

function trimAccessToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function configureCurrentUserId(userId: string | null | undefined) {
  configuredCurrentUserId = trimUserId(userId);
  if (!configuredCurrentUserId) {
    if (typeof globalThis !== "undefined") {
      delete (globalThis as Record<string, unknown>)[GLOBAL_CURRENT_USER_KEY];
    }
    removeStoredValue(CURRENT_USER_STORAGE_KEY);
    return;
  }
  writeGlobalCurrentUserId(configuredCurrentUserId);
  writeStoredCurrentUserId(configuredCurrentUserId);
}

export function configureAccessToken(token: string | null | undefined) {
  configuredAccessToken = trimAccessToken(token);
  if (!configuredAccessToken) {
    if (typeof globalThis !== "undefined") {
      delete (globalThis as Record<string, unknown>)[GLOBAL_ACCESS_TOKEN_KEY];
    }
    removeStoredValue(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }
  if (typeof globalThis !== "undefined") {
    (globalThis as Record<string, unknown>)[GLOBAL_ACCESS_TOKEN_KEY] = configuredAccessToken;
  }
  writeStoredAccessToken(configuredAccessToken);
}

export function getConfiguredCurrentUserId(): string | null {
  return ensureCurrentUserId();
}

export function getConfiguredAccessToken(): string | null {
  return ensureAccessToken();
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

function readStoredAccessToken(): string | null {
  if (typeof globalThis === "undefined") return null;
  const storage = (globalThis as { localStorage?: { getItem: (key: string) => string | null } }).localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return trimAccessToken(storage.getItem(ACCESS_TOKEN_STORAGE_KEY));
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

function removeStoredValue(key: string): void {
  if (typeof globalThis === "undefined") return;
  const storage = (globalThis as { localStorage?: { removeItem: (itemKey: string) => void } }).localStorage;
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(key);
  } catch {
    // Best-effort only.
  }
}

function writeStoredAccessToken(token: string): void {
  if (typeof globalThis === "undefined") return;
  const storage = (globalThis as { localStorage?: { setItem: (key: string, value: string) => void } }).localStorage;
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch {
    // Best-effort only.
  }
}

function readGlobalCurrentUserId(): string | null {
  if (typeof globalThis === "undefined") return null;
  return trimUserId((globalThis as Record<string, unknown>)[GLOBAL_CURRENT_USER_KEY] as string | undefined);
}

function readGlobalAccessToken(): string | null {
  if (typeof globalThis === "undefined") return null;
  return trimAccessToken((globalThis as Record<string, unknown>)[GLOBAL_ACCESS_TOKEN_KEY] as string | undefined);
}

function writeGlobalCurrentUserId(userId: string): void {
  if (typeof globalThis === "undefined") return;
  (globalThis as Record<string, unknown>)[GLOBAL_CURRENT_USER_KEY] = userId;
}

function writeGlobalAccessToken(token: string): void {
  if (typeof globalThis === "undefined") return;
  (globalThis as Record<string, unknown>)[GLOBAL_ACCESS_TOKEN_KEY] = token;
}

function readEnvCurrentUserId(): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  return trimUserId(process.env.NEXT_PUBLIC_YURBRAIN_USER_ID ?? process.env.EXPO_PUBLIC_YURBRAIN_USER_ID ?? null);
}

function readEnvAccessToken(): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  return trimAccessToken(process.env.NEXT_PUBLIC_YURBRAIN_ACCESS_TOKEN ?? process.env.EXPO_PUBLIC_YURBRAIN_ACCESS_TOKEN ?? null);
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

function ensureAccessToken(): string | null {
  if (configuredAccessToken) return configuredAccessToken;
  const resolved = readGlobalAccessToken() ?? readStoredAccessToken() ?? readEnvAccessToken();
  configuredAccessToken = trimAccessToken(resolved);
  if (configuredAccessToken) {
    writeGlobalAccessToken(configuredAccessToken);
    writeStoredAccessToken(configuredAccessToken);
  }
  return configuredAccessToken;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const currentUserId = ensureCurrentUserId();
  if (currentUserId && !headers.has(CURRENT_USER_HEADER)) {
    headers.set(CURRENT_USER_HEADER, currentUserId);
  }
  const accessToken = ensureAccessToken();
  if (accessToken && !headers.has(AUTHORIZATION_HEADER)) {
    headers.set(AUTHORIZATION_HEADER, `Bearer ${accessToken}`);
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
