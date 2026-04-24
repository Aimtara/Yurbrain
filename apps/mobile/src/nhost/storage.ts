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

async function hydrateSessionFromStorage() {
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
}

void hydrateSessionFromStorage();

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
