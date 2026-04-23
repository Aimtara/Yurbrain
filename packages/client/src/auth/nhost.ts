import { createClient, type NhostClient } from "@nhost/nhost-js";
import {
  configureIdentityResolutionMode,
  configureAccessToken,
  configureCurrentUserId
} from "../api/client";
import { configureHasuraGraphqlUrl } from "../graphql/hasura-client";

declare const process:
  | {
      env?: {
        YURBRAIN_NHOST_SUBDOMAIN?: string;
        YURBRAIN_NHOST_REGION?: string;
        YURBRAIN_NHOST_AUTH_URL?: string;
        YURBRAIN_NHOST_GRAPHQL_URL?: string;
        YURBRAIN_NHOST_FUNCTIONS_URL?: string;
        NEXT_PUBLIC_NHOST_SUBDOMAIN?: string;
        NEXT_PUBLIC_NHOST_REGION?: string;
        NEXT_PUBLIC_NHOST_AUTH_URL?: string;
        NEXT_PUBLIC_NHOST_GRAPHQL_URL?: string;
        NEXT_PUBLIC_NHOST_FUNCTIONS_URL?: string;
        EXPO_PUBLIC_NHOST_SUBDOMAIN?: string;
        EXPO_PUBLIC_NHOST_REGION?: string;
        EXPO_PUBLIC_NHOST_AUTH_URL?: string;
        EXPO_PUBLIC_NHOST_GRAPHQL_URL?: string;
        EXPO_PUBLIC_NHOST_FUNCTIONS_URL?: string;
      };
    }
  | undefined;

export type NhostRuntimeConfig = {
  subdomain?: string;
  region?: string;
  authUrl?: string;
  graphqlUrl?: string;
  functionsUrl?: string;
};

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
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  return process.env as NhostEnv;
}

function resolveEnvValue(keys: string[]): string | undefined {
  const env = getNhostEnv();
  if (!env) return undefined;
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function trimUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const normalized = url.trim();
  if (!normalized) return undefined;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function deriveNhostServiceUrl(
  service: "auth" | "graphql" | "functions",
  subdomain: string | undefined,
  region: string | undefined
): string | undefined {
  if (!subdomain || !region) return undefined;
  if (service === "auth") {
    return `https://${subdomain}.auth.${region}.nhost.run/v1`;
  }
  if (service === "graphql") {
    return `https://${subdomain}.graphql.${region}.nhost.run/v1/graphql`;
  }
  return `https://${subdomain}.functions.${region}.nhost.run/v1`;
}

export function buildNhostRuntimeConfig(): NhostRuntimeConfig | null {
  const subdomain = resolveEnvValue([
    "YURBRAIN_NHOST_SUBDOMAIN",
    "NEXT_PUBLIC_NHOST_SUBDOMAIN",
    "EXPO_PUBLIC_NHOST_SUBDOMAIN"
  ]);
  const region = resolveEnvValue([
    "YURBRAIN_NHOST_REGION",
    "NEXT_PUBLIC_NHOST_REGION",
    "EXPO_PUBLIC_NHOST_REGION"
  ]);
  const explicitAuthUrl = trimUrl(
    resolveEnvValue([
      "YURBRAIN_NHOST_AUTH_URL",
      "NEXT_PUBLIC_NHOST_AUTH_URL",
      "EXPO_PUBLIC_NHOST_AUTH_URL"
    ])
  );
  const explicitGraphqlUrl = trimUrl(
    resolveEnvValue([
      "YURBRAIN_NHOST_GRAPHQL_URL",
      "NEXT_PUBLIC_NHOST_GRAPHQL_URL",
      "EXPO_PUBLIC_NHOST_GRAPHQL_URL"
    ])
  );
  const explicitFunctionsUrl = trimUrl(
    resolveEnvValue([
      "YURBRAIN_NHOST_FUNCTIONS_URL",
      "NEXT_PUBLIC_NHOST_FUNCTIONS_URL",
      "EXPO_PUBLIC_NHOST_FUNCTIONS_URL"
    ])
  );

  const authUrl = explicitAuthUrl ?? deriveNhostServiceUrl("auth", subdomain, region);
  const graphqlUrl =
    explicitGraphqlUrl ?? deriveNhostServiceUrl("graphql", subdomain, region);
  const functionsUrl =
    explicitFunctionsUrl ?? deriveNhostServiceUrl("functions", subdomain, region);

  if (!subdomain && !authUrl && !graphqlUrl && !functionsUrl) {
    return null;
  }

  return {
    subdomain,
    region,
    authUrl,
    graphqlUrl,
    functionsUrl
  };
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

export function resetNhostBootstrapStateForTests() {
  bootstrapped = false;
  cachedConfigured = false;
  configureIdentityResolutionMode("legacy");
  customClientFactory = null;
  setNhostEnvResolver(null);
}
