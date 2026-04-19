type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function resolveStorage(): StorageLike | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  if (!candidate) return null;
  if (typeof candidate.getItem !== "function" || typeof candidate.setItem !== "function") return null;
  return candidate;
}

export function readStorageString(key: string): string | null {
  const storage = resolveStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageString(key: string, value: string): void {
  const storage = resolveStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore local persistence failures; runtime state remains source of truth.
  }
}

export function getStoredState<T>(key: string): T | null {
  const raw = readStorageString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredState(key: string, value: unknown): void {
  writeStorageString(key, JSON.stringify(value));
}
