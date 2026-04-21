import { createClient } from "@nhost/nhost-js";
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

let customEnvResolver: NhostEnvResolver | null = null;

export function setNhostEnvResolver(
  resolver: NhostEnvResolver | null
) {
  customEnvResolver = resolver;
}

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

  const nhost = createClient(options);
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

export function resetNhostBootstrapStateForTests() {
  bootstrapped = false;
  cachedConfigured = false;
  configureIdentityResolutionMode("legacy");
  setNhostEnvResolver(null);
}
