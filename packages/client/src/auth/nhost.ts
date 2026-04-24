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

export async function bootstrapNhostSession(): Promise<{ configured: boolean; userId?: string }> {
  if (bootstrapped) {
    return { configured: cachedConfigured };
  }

  // N4: once nhost transport is selected, disable demo/runtime identity fallback.
  configureIdentityResolutionMode("strict");
  const options = buildNhostRuntimeConfig();
  if (!options) {
    configureCurrentUserId(null);
    configureAccessToken(null);
    cachedConfigured = false;
    return { configured: false };
  }
  cachedConfigured = true;
  if (options.graphqlUrl) {
    configureHasuraGraphqlUrl(options.graphqlUrl);
  }

  const nhost = customClientFactory ? customClientFactory(options) : createClient(options);
  const session = nhost.getUserSession();
  if (!session) {
    configureCurrentUserId(null);
    configureAccessToken(null);
    bootstrapped = true;
    return { configured: true };
  }

  const userId =
    typeof session.user?.id === "string" && session.user.id.trim().length > 0
      ? session.user.id
      : typeof session.decodedToken?.sub === "string" && session.decodedToken.sub.trim().length > 0
        ? session.decodedToken.sub
        : undefined;

  if (typeof session.accessToken === "string" && session.accessToken.trim().length > 0) {
    configureAccessToken(session.accessToken);
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
