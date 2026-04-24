import {
  createServerNhostClientFromEnv,
  resolveServerNhostAdminHeaders,
  resolveServerNhostConfig
} from "@yurbrain/nhost";
import {
  queryNhostAdminGraphql,
  type QueryNhostOptions
} from "./graphql";

let cachedServerNhostClient: ReturnType<typeof createServerNhostClientFromEnv> | null = null;

export function getServerNhostClient() {
  if (cachedServerNhostClient) return cachedServerNhostClient;
  cachedServerNhostClient = createServerNhostClientFromEnv();
  return cachedServerNhostClient;
}

export function getServerNhostAdminHeaders() {
  return resolveServerNhostAdminHeaders();
}

export function assertServerNhostAdminConfig() {
  const config = resolveServerNhostConfig();
  if (!config.adminSecret) {
    throw new Error("[nhost] Missing NHOST_ADMIN_SECRET for privileged API usage.");
  }
  return config;
}

export function executeServerGraphqlWithAdminSecret<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: QueryNhostOptions = {}
) {
  return queryNhostAdminGraphql<T>(query, variables, undefined, options);
}
