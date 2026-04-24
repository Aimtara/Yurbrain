import { createClient, type NhostClient } from "@nhost/nhost-js";
import {
  resolveSharedNhostRuntimeConfig,
  type SharedNhostRuntimeConfig
} from "@yurbrain/nhost";
import {
  configureIdentityResolutionMode,
  configureAccessToken,
  configureCurrentUserId
} from "../api/client";
import { configureHasuraGraphqlUrl } from "../graphql/hasura-client";

export type NhostRuntimeConfig = SharedNhostRuntimeConfig;

type NhostEnv = Record<string, string | undefined>;
type NhostEnvResolver = () => NhostEnv | undefined;
type NhostClientFactory = (options: NhostRuntimeConfig) => NhostClient;

let customEnvResolver: NhostEnvResolver | null = null;
let customClientFactory: NhostClientFactory | null = null;

export function setNhostEnvResolver(
  resolver: NhostEnvResolver | null
) {
  customEnvResolver = resolver;
}

export function setNhostClientFactory(factory: NhostClientFactory | null) {
  customClientFactory = factory;
}

// Backward-compatible alias used by existing test helpers.
export const setNhostSessionResolver = setNhostClientFactory;

function getNhostEnv(): NhostEnv | undefined {
  if (customEnvResolver) {
    return customEnvResolver();
  }
  return undefined;
}

export function buildNhostRuntimeConfig(): NhostRuntimeConfig | null {
  return resolveSharedNhostRuntimeConfig(getNhostEnv());
}

let bootstrapped = false;
let cachedConfigured = false;

type BrowserNhostSession = {
  accessToken?: unknown;
  user?: { id?: unknown } | null;
  decodedToken?: { sub?: unknown } | null;
};

function readStoredBrowserNhostSession(): BrowserNhostSession | null {
  if (typeof globalThis === "undefined") return null;
  const storage = (globalThis as { localStorage?: { getItem: (key: string) => string | null } }).localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const raw = storage.getItem("nhostSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as BrowserNhostSession;
  } catch {
    return null;
  }
}

function resolveSessionIdentity(session: BrowserNhostSession | null): { accessToken?: string; userId?: string } {
  if (!session) return {};
  const accessToken =
    typeof session.accessToken === "string" && session.accessToken.trim().length > 0
      ? session.accessToken
      : undefined;
  const userId =
    typeof session.user?.id === "string" && session.user.id.trim().length > 0
      ? session.user.id
      : typeof session.decodedToken?.sub === "string" && session.decodedToken.sub.trim().length > 0
        ? session.decodedToken.sub
        : undefined;
  return { accessToken, userId };
}

export async function bootstrapNhostSession(): Promise<{ configured: boolean; userId?: string }> {
  if (bootstrapped) {
    return { configured: cachedConfigured };
  }

  // N4: once nhost transport is selected, disable demo/runtime identity fallback.
  configureIdentityResolutionMode("strict");
  // Keep web core-loop calls on the API/domain path; do not auto-enable direct Hasura GraphQL transport from Nhost URLs.
  configureHasuraGraphqlUrl(null);
  const storedSessionIdentity = resolveSessionIdentity(readStoredBrowserNhostSession());
  if (storedSessionIdentity.accessToken) {
    configureAccessToken(storedSessionIdentity.accessToken);
  }
  if (storedSessionIdentity.userId) {
    configureCurrentUserId(storedSessionIdentity.userId);
  }

  const options = buildNhostRuntimeConfig();
  if (!options) {
    const hasStoredSessionIdentity = Boolean(storedSessionIdentity.accessToken && storedSessionIdentity.userId);
    if (!hasStoredSessionIdentity) {
      configureCurrentUserId(null);
      configureAccessToken(null);
      cachedConfigured = false;
      return { configured: false };
    }
    bootstrapped = true;
    cachedConfigured = true;
    return { configured: true, userId: storedSessionIdentity.userId };
  }
  cachedConfigured = true;

  const nhost = customClientFactory ? customClientFactory(options) : createClient(options);
  const session = nhost.getUserSession();
  if (!session) {
    if (!storedSessionIdentity.accessToken || !storedSessionIdentity.userId) {
      configureCurrentUserId(null);
      configureAccessToken(null);
      bootstrapped = true;
      return { configured: true };
    }
    bootstrapped = true;
    return { configured: true, userId: storedSessionIdentity.userId };
  }

  const { accessToken, userId } = resolveSessionIdentity(session);

  if (accessToken) {
    configureAccessToken(accessToken);
  }
  if (userId) {
    configureCurrentUserId(userId);
  }

  bootstrapped = true;
  return { configured: true, userId };
}

export function markAuthenticatedNhostSession(
  accessToken: string,
  userId: string
) {
  configureIdentityResolutionMode("strict");
  configureAccessToken(accessToken);
  configureCurrentUserId(userId);
  bootstrapped = true;
  cachedConfigured = true;
}

export function clearAuthenticatedNhostSession() {
  configureIdentityResolutionMode("strict");
  configureAccessToken(null);
  configureCurrentUserId(null);
  bootstrapped = true;
  cachedConfigured = true;
}

export function syncAuthenticatedNhostSession(
  session: BrowserNhostSession | null
): { authenticated: boolean; userId?: string } {
  const { accessToken, userId } = resolveSessionIdentity(session);
  if (accessToken && userId) {
    markAuthenticatedNhostSession(accessToken, userId);
    return { authenticated: true, userId };
  }
  clearAuthenticatedNhostSession();
  return { authenticated: false };
}

export function syncAuthenticatedTokenOnlySession(
  session: { accessToken?: string; user?: { id?: string } | null; decodedToken?: { sub?: string } | null } | null
): { authenticated: boolean; userId?: string } {
  const bridgedSession: BrowserNhostSession | null = session
    ? {
        accessToken: session.accessToken,
        user: session.user ? { id: session.user.id } : null,
        decodedToken: session.decodedToken ? { sub: session.decodedToken.sub } : null
      }
    : null;
  return syncAuthenticatedNhostSession(bridgedSession);
}

export function resetNhostBootstrapStateForTests() {
  bootstrapped = false;
  cachedConfigured = false;
  configureIdentityResolutionMode("legacy");
  customClientFactory = null;
  setNhostEnvResolver(null);
}
