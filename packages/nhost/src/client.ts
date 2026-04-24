import { createClient, type NhostClient } from "@nhost/nhost-js";
import type { SessionStorageBackend } from "@nhost/nhost-js/session";
import { createNhostRequestError } from "./errors";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

type EnvRecord = Record<string, string | undefined>;
type RuntimeTarget = "web" | "mobile";

export type PublicNhostConfig = {
  subdomain?: string;
  region?: string;
  backendUrl?: string;
  graphqlUrl?: string;
  authUrl?: string;
  functionsUrl?: string;
  storageUrl?: string;
  anonKey: string;
};

export type ServerNhostConfig = PublicNhostConfig & {
  adminSecret: string;
};

export type SharedNhostRuntimeConfig = {
  subdomain?: string;
  region?: string;
  authUrl?: string;
  graphqlUrl?: string;
  functionsUrl?: string;
};

export type NhostGraphqlVariables = Record<string, unknown>;

function getProcessEnv(): EnvRecord {
  if (typeof process === "undefined" || !process.env) {
    return {};
  }
  return process.env;
}

function trimValue(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function trimUrl(value: string | undefined): string | undefined {
  const normalized = trimValue(value);
  if (!normalized) return undefined;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function requireValue(value: string | undefined, keyName: string): string {
  if (value) return value;
  throw new Error(`[nhost] Missing required environment variable: ${keyName}`);
}

function resolveFirst(env: EnvRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = trimValue(env[key]);
    if (value) return value;
  }
  return undefined;
}

function resolveUrl(env: EnvRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = trimUrl(env[key]);
    if (value) return value;
  }
  return undefined;
}

function ensureBaseFromSubdomainAndRegion(subdomain?: string, region?: string): string | undefined {
  if (!subdomain || !region) return undefined;
  return `https://${subdomain}.${region}.nhost.run`;
}

function deriveLegacyServiceUrl(
  service: "auth" | "graphql" | "functions",
  subdomain?: string,
  region?: string
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

function buildServiceUrls(config: {
  backendUrl?: string;
  authUrl?: string;
  graphqlUrl?: string;
  functionsUrl?: string;
  storageUrl?: string;
}) {
  const backendUrl = trimUrl(config.backendUrl);
  return {
    backendUrl,
    authUrl: trimUrl(config.authUrl) ?? (backendUrl ? `${backendUrl}/v1/auth` : undefined),
    graphqlUrl: trimUrl(config.graphqlUrl) ?? (backendUrl ? `${backendUrl}/v1/graphql` : undefined),
    functionsUrl: trimUrl(config.functionsUrl) ?? (backendUrl ? `${backendUrl}/v1/functions` : undefined),
    storageUrl: trimUrl(config.storageUrl) ?? (backendUrl ? `${backendUrl}/v1/storage` : undefined)
  };
}

export function resolveSharedNhostRuntimeConfig(
  customEnv: EnvRecord = getProcessEnv()
): SharedNhostRuntimeConfig | null {
  const subdomain = resolveFirst(customEnv, [
    "YURBRAIN_NHOST_SUBDOMAIN",
    "NEXT_PUBLIC_NHOST_SUBDOMAIN",
    "EXPO_PUBLIC_NHOST_SUBDOMAIN",
    "NHOST_SUBDOMAIN"
  ]);
  const region = resolveFirst(customEnv, [
    "YURBRAIN_NHOST_REGION",
    "NEXT_PUBLIC_NHOST_REGION",
    "EXPO_PUBLIC_NHOST_REGION",
    "NHOST_REGION"
  ]);
  const backendUrl = resolveUrl(customEnv, [
    "YURBRAIN_NHOST_BACKEND_URL",
    "NEXT_PUBLIC_NHOST_BACKEND_URL",
    "EXPO_PUBLIC_NHOST_BACKEND_URL",
    "NHOST_BACKEND_URL"
  ]);
  const explicitAuthUrl = resolveUrl(customEnv, [
    "YURBRAIN_NHOST_AUTH_URL",
    "NEXT_PUBLIC_NHOST_AUTH_URL",
    "EXPO_PUBLIC_NHOST_AUTH_URL",
    "NHOST_AUTH_URL"
  ]);
  const explicitGraphqlUrl = resolveUrl(customEnv, [
    "YURBRAIN_NHOST_GRAPHQL_URL",
    "NEXT_PUBLIC_NHOST_GRAPHQL_URL",
    "EXPO_PUBLIC_NHOST_GRAPHQL_URL",
    "NHOST_GRAPHQL_URL"
  ]);
  const explicitFunctionsUrl = resolveUrl(customEnv, [
    "YURBRAIN_NHOST_FUNCTIONS_URL",
    "NEXT_PUBLIC_NHOST_FUNCTIONS_URL",
    "EXPO_PUBLIC_NHOST_FUNCTIONS_URL",
    "NHOST_FUNCTIONS_URL"
  ]);

  const serviceUrls = buildServiceUrls({
    backendUrl,
    authUrl: explicitAuthUrl ?? deriveLegacyServiceUrl("auth", subdomain, region),
    graphqlUrl: explicitGraphqlUrl ?? deriveLegacyServiceUrl("graphql", subdomain, region),
    functionsUrl:
      explicitFunctionsUrl ?? deriveLegacyServiceUrl("functions", subdomain, region)
  });

  if (!subdomain && !serviceUrls.authUrl && !serviceUrls.graphqlUrl && !serviceUrls.functionsUrl) {
    return null;
  }

  return {
    subdomain,
    region,
    authUrl: serviceUrls.authUrl,
    graphqlUrl: serviceUrls.graphqlUrl,
    functionsUrl: serviceUrls.functionsUrl
  };
}

export function createNhostClientFromRuntimeConfig(
  config: SharedNhostRuntimeConfig
): NhostClient {
  return createClient(config);
}

function assertPublicShape(config: PublicNhostConfig, target: RuntimeTarget) {
  if (!config.anonKey) {
    const expectedKey = target === "web" ? "NEXT_PUBLIC_NHOST_ANON_KEY" : "EXPO_PUBLIC_NHOST_ANON_KEY";
    throw new Error(`[nhost] Missing required environment variable: ${expectedKey}`);
  }

  const hasAddressing = Boolean(config.backendUrl) || Boolean(config.subdomain && config.region) || Boolean(config.authUrl);
  if (!hasAddressing) {
    const prefix = target === "web" ? "NEXT_PUBLIC" : "EXPO_PUBLIC";
    throw new Error(
      `[nhost] Missing Nhost addressing configuration. Set ${prefix}_NHOST_BACKEND_URL or ${prefix}_NHOST_SUBDOMAIN + ${prefix}_NHOST_REGION or ${prefix}_NHOST_AUTH_URL.`
    );
  }
}

export function resolveWebPublicNhostConfig(customEnv: EnvRecord = getProcessEnv()): PublicNhostConfig {
  const subdomain = resolveFirst(customEnv, ["NEXT_PUBLIC_NHOST_SUBDOMAIN"]);
  const region = resolveFirst(customEnv, ["NEXT_PUBLIC_NHOST_REGION"]);
  const backendUrl = resolveUrl(customEnv, ["NEXT_PUBLIC_NHOST_BACKEND_URL"]);
  const anonKey = requireValue(resolveFirst(customEnv, ["NEXT_PUBLIC_NHOST_ANON_KEY"]), "NEXT_PUBLIC_NHOST_ANON_KEY");
  const serviceUrls = buildServiceUrls({
    backendUrl: backendUrl ?? ensureBaseFromSubdomainAndRegion(subdomain, region),
    authUrl: resolveUrl(customEnv, ["NEXT_PUBLIC_NHOST_AUTH_URL"]),
    graphqlUrl: resolveUrl(customEnv, ["NEXT_PUBLIC_NHOST_GRAPHQL_URL"]),
    functionsUrl: resolveUrl(customEnv, ["NEXT_PUBLIC_NHOST_FUNCTIONS_URL"]),
    storageUrl: resolveUrl(customEnv, ["NEXT_PUBLIC_NHOST_STORAGE_URL"])
  });
  const config: PublicNhostConfig = {
    subdomain,
    region,
    anonKey,
    ...serviceUrls
  };
  assertPublicShape(config, "web");
  return config;
}

export function resolveMobilePublicNhostConfig(customEnv: EnvRecord = getProcessEnv()): PublicNhostConfig {
  const subdomain = resolveFirst(customEnv, ["EXPO_PUBLIC_NHOST_SUBDOMAIN"]);
  const region = resolveFirst(customEnv, ["EXPO_PUBLIC_NHOST_REGION"]);
  const backendUrl = resolveUrl(customEnv, ["EXPO_PUBLIC_NHOST_BACKEND_URL"]);
  const anonKey = requireValue(resolveFirst(customEnv, ["EXPO_PUBLIC_NHOST_ANON_KEY"]), "EXPO_PUBLIC_NHOST_ANON_KEY");
  const serviceUrls = buildServiceUrls({
    backendUrl: backendUrl ?? ensureBaseFromSubdomainAndRegion(subdomain, region),
    authUrl: resolveUrl(customEnv, ["EXPO_PUBLIC_NHOST_AUTH_URL"]),
    graphqlUrl: resolveUrl(customEnv, ["EXPO_PUBLIC_NHOST_GRAPHQL_URL"]),
    functionsUrl: resolveUrl(customEnv, ["EXPO_PUBLIC_NHOST_FUNCTIONS_URL"]),
    storageUrl: resolveUrl(customEnv, ["EXPO_PUBLIC_NHOST_STORAGE_URL"])
  });
  const config: PublicNhostConfig = {
    subdomain,
    region,
    anonKey,
    ...serviceUrls
  };
  assertPublicShape(config, "mobile");
  return config;
}

export function resolveServerNhostConfig(customEnv: EnvRecord = getProcessEnv()): ServerNhostConfig {
  const subdomain = resolveFirst(customEnv, ["NHOST_SUBDOMAIN", "YURBRAIN_NHOST_SUBDOMAIN"]);
  const region = resolveFirst(customEnv, ["NHOST_REGION", "YURBRAIN_NHOST_REGION"]);
  const backendUrl = resolveUrl(customEnv, ["NHOST_BACKEND_URL", "YURBRAIN_NHOST_BACKEND_URL"]);
  const anonKey = requireValue(
    resolveFirst(customEnv, ["NHOST_ANON_KEY", "YURBRAIN_NHOST_ANON_KEY"]),
    "NHOST_ANON_KEY"
  );
  const adminSecret = requireValue(
    resolveFirst(customEnv, [
      "NHOST_ADMIN_SECRET",
      "YURBRAIN_NHOST_ADMIN_SECRET",
      "YURBRAIN_HASURA_ADMIN_SECRET"
    ]),
    "NHOST_ADMIN_SECRET"
  );

  const serviceUrls = buildServiceUrls({
    backendUrl: backendUrl ?? ensureBaseFromSubdomainAndRegion(subdomain, region),
    authUrl: resolveUrl(customEnv, ["NHOST_AUTH_URL", "YURBRAIN_NHOST_AUTH_URL"]),
    graphqlUrl: resolveUrl(customEnv, ["NHOST_GRAPHQL_URL", "YURBRAIN_NHOST_GRAPHQL_URL", "YURBRAIN_HASURA_GRAPHQL_URL"]),
    functionsUrl: resolveUrl(customEnv, ["NHOST_FUNCTIONS_URL", "YURBRAIN_NHOST_FUNCTIONS_URL"]),
    storageUrl: resolveUrl(customEnv, ["NHOST_STORAGE_URL", "YURBRAIN_NHOST_STORAGE_URL"])
  });

  const config: ServerNhostConfig = {
    subdomain,
    region,
    anonKey,
    adminSecret,
    ...serviceUrls
  };

  if (!config.backendUrl && !(config.subdomain && config.region) && !config.authUrl) {
    throw new Error(
      "[nhost] Missing server Nhost addressing configuration. Set NHOST_BACKEND_URL or NHOST_SUBDOMAIN + NHOST_REGION or NHOST_AUTH_URL."
    );
  }

  return config;
}

type CreateClientInput = Pick<
  PublicNhostConfig,
  "subdomain" | "region" | "authUrl" | "graphqlUrl" | "functionsUrl" | "storageUrl"
> & {
  storage?: SessionStorageBackend;
};

function createBaseNhostClient(config: CreateClientInput): NhostClient {
  return createClient({
    subdomain: config.subdomain,
    region: config.region,
    authUrl: config.authUrl,
    graphqlUrl: config.graphqlUrl,
    functionsUrl: config.functionsUrl,
    storageUrl: config.storageUrl,
    storage: config.storage
  });
}

export function createWebNhostClientFromEnv(customEnv: EnvRecord = getProcessEnv()): NhostClient {
  const config = resolveWebPublicNhostConfig(customEnv);
  return createBaseNhostClient(config);
}

export function createMobileNhostClientFromEnv(
  customEnv: EnvRecord = getProcessEnv(),
  options: { storage?: SessionStorageBackend } = {}
): NhostClient {
  const config = resolveMobilePublicNhostConfig(customEnv);
  return createBaseNhostClient({
    ...config,
    storage: options.storage
  });
}

export function createServerNhostClientFromEnv(customEnv: EnvRecord = getProcessEnv()): NhostClient {
  const config = resolveServerNhostConfig(customEnv);
  return createBaseNhostClient(config);
}

export function resolveServerNhostAdminHeaders(
  customEnv: EnvRecord = getProcessEnv()
): Record<string, string> {
  const config = resolveServerNhostConfig(customEnv);
  return {
    "x-hasura-admin-secret": config.adminSecret
  };
}

export async function executeServerGraphqlWithAdminSecret<T>(
  query: string,
  variables: NhostGraphqlVariables = {},
  customEnv: EnvRecord = getProcessEnv()
): Promise<T> {
  const config = resolveServerNhostConfig(customEnv);
  const operation = "executeServerGraphqlWithAdminSecret";
  if (!config.graphqlUrl) {
    throw createNhostRequestError({
      code: "NHOST_CONFIG_ERROR",
      message:
        "[nhost] Missing GraphQL URL for server admin request. Set NHOST_GRAPHQL_URL or NHOST_BACKEND_URL.",
      operation,
      retryable: false,
      userMessage: "Server configuration is incomplete for this request."
    });
  }

  let response: Response;
  try {
    response = await fetch(config.graphqlUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...resolveServerNhostAdminHeaders(customEnv)
      },
      body: JSON.stringify({ query, variables })
    });
  } catch (caught) {
    throw createNhostRequestError({
      code: "NHOST_NETWORK_ERROR",
      message:
        caught instanceof Error && caught.message
          ? caught.message
          : "[nhost] Network error while executing server GraphQL request",
      operation,
      retryable: true,
      userMessage: "Network issue while contacting the backend service."
    });
  }

  if (!response.ok) {
    throw createNhostRequestError({
      code: "NHOST_HTTP_ERROR",
      message: `[nhost] GraphQL request failed with status ${response.status}`,
      statusCode: response.status,
      operation
    });
  }

  const parsed = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    throw createNhostRequestError({
      code: "NHOST_GRAPHQL_ERROR",
      message: parsed.errors[0]?.message || "[nhost] GraphQL request returned errors",
      operation,
      retryable: false,
      userMessage: "Unable to complete this request right now."
    });
  }
  if (parsed.data === undefined) {
    throw createNhostRequestError({
      code: "NHOST_GRAPHQL_ERROR",
      message: "[nhost] GraphQL request returned no data",
      operation,
      retryable: false,
      userMessage: "Unable to complete this request right now."
    });
  }
  return parsed.data;
}
