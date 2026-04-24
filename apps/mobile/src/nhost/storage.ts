import AsyncStorage from "@react-native-async-storage/async-storage";

type SessionValue = Record<string, unknown>;

type SessionStorageBackend = {
  get: () => SessionValue | null;
  set: (value: SessionValue) => void;
  remove: () => void;
};

const SESSION_STORAGE_KEY = "nhostSession";

let cachedSession: SessionValue | null = null;
let initialized = false;
let hydrationPromise: Promise<void> | null = null;

export async function hydrateMobileNhostSessionStorage() {
  if (hydrationPromise) {
    await hydrationPromise;
    return;
  }
  hydrationPromise = (async () => {
    if (initialized) return;
    initialized = true;
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        cachedSession = null;
        return;
      }
      cachedSession = JSON.parse(raw) as SessionValue;
    } catch {
      cachedSession = null;
    }
  })();
  await hydrationPromise;
}

export async function ensureMobileNhostSessionHydrated() {
  await hydrateMobileNhostSessionStorage();
}

export function getMobileNhostHydrationState(): "loading" | "ready" {
  if (!initialized) return "loading";
  return "ready";
}

void hydrateMobileNhostSessionStorage();

export function createMobileNhostSessionStorage(): SessionStorageBackend {
  return {
    get() {
      return cachedSession;
    },
    set(value) {
      cachedSession = value;
      void AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
    },
    remove() {
      cachedSession = null;
      void AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };
}
