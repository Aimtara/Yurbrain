import {
  apiClient,
  configureCurrentUserId
} from "../api/client";
import { endpoints } from "../api/endpoints";

const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const USER_ID_STORAGE_KEY = "yurbrain.currentUserId";
const GLOBAL_USER_ID_KEY = "__YURBRAIN_CURRENT_USER_ID";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

declare const process:
  | {
      env?: {
        NEXT_PUBLIC_YURBRAIN_USER_ID?: string;
        EXPO_PUBLIC_YURBRAIN_USER_ID?: string;
      };
    }
  | undefined;

type GlobalWithCurrentUser = typeof globalThis & {
  [GLOBAL_USER_ID_KEY]?: string;
};

export type CurrentUserResponse = {
  id: string;
  source: "header" | "authorization" | "legacy_query" | "legacy_params" | "legacy_body" | "test_fallback";
};

function resolveStorage(): StorageLike | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  if (!candidate) return null;
  if (typeof candidate.getItem !== "function" || typeof candidate.setItem !== "function") return null;
  return candidate;
}

function readStoredCurrentUserId(): string | null {
  const storage = resolveStorage();
  if (!storage) return null;
  try {
    return storage.getItem(USER_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistCurrentUserId(userId: string) {
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(USER_ID_STORAGE_KEY, userId);
  } catch {
    // Persistence is best-effort only.
  }
}

function resolveFromGlobal(): string | null {
  if (typeof globalThis === "undefined") return null;
  const value = (globalThis as GlobalWithCurrentUser)[GLOBAL_USER_ID_KEY];
  return typeof value === "string" ? value : null;
}

function resolveFromEnvironment(): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  return process.env.NEXT_PUBLIC_YURBRAIN_USER_ID ?? process.env.EXPO_PUBLIC_YURBRAIN_USER_ID ?? null;
}

export function getCurrentUserId(): string | null {
  const explicit = resolveFromGlobal();
  if (explicit) return explicit;
  const fromStorage = readStoredCurrentUserId();
  if (fromStorage) return fromStorage;
  const fromEnv = resolveFromEnvironment();
  if (fromEnv) return fromEnv;
  return null;
}

export function setCurrentUserId(userId: string) {
  if (typeof globalThis !== "undefined") {
    (globalThis as GlobalWithCurrentUser)[GLOBAL_USER_ID_KEY] = userId;
  }
  persistCurrentUserId(userId);
  configureCurrentUserId(userId);
}

export function buildCurrentUserHeaders(existing: HeadersInit | undefined): Headers {
  const headers = new Headers(existing);
  const currentUserId = getCurrentUserId();
  if (currentUserId) {
    headers.set(CURRENT_USER_HEADER, currentUserId);
  }
  return headers;
}

export async function fetchCurrentUser<T extends CurrentUserResponse = CurrentUserResponse>() {
  const response = await apiClient<T>(endpoints.authMe, {
    method: "GET",
    headers: buildCurrentUserHeaders(undefined)
  });
  setCurrentUserId(response.id);
  return response;
}
