import { getConfiguredCurrentUserId } from "../api/client";

let configuredHasuraGraphqlUrl: string | null = null;
let configuredHasuraAdminSecret: string | null = null;
let configuredHasuraRole: string | null = null;
const FALLBACK_GRAPHQL_ERROR_CODE = "HASURA_GRAPHQL_REQUEST_FAILED";

export class HasuraGraphqlClientError extends Error {
  statusCode?: number;
  code: string;

  constructor(
    message: string,
    input: {
      statusCode?: number;
      code?: string;
    }
  ) {
    super(message);
    this.name = "HasuraGraphqlClientError";
    this.statusCode = input.statusCode;
    this.code = input.code ?? FALLBACK_GRAPHQL_ERROR_CODE;
  }
}

function toStatusFallbackMessage(statusCode: number): string {
  if (statusCode === 400) return "Validation failed.";
  if (statusCode === 401) return "Authentication required.";
  if (statusCode === 403) return "Access denied.";
  if (statusCode === 404) return "Requested resource not found.";
  if (statusCode >= 500) return "GraphQL service error. Please retry.";
  return `GraphQL request failed (${statusCode}).`;
}

declare const process:
  | {
      env?: {
        YURBRAIN_HASURA_GRAPHQL_URL?: string;
        NEXT_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL?: string;
        EXPO_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL?: string;
        YURBRAIN_HASURA_ADMIN_SECRET?: string;
        YURBRAIN_HASURA_ROLE?: string;
        NEXT_PUBLIC_YURBRAIN_HASURA_ROLE?: string;
        EXPO_PUBLIC_YURBRAIN_HASURA_ROLE?: string;
      };
    }
  | undefined;

function trim(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function trimGraphqlUrl(value: string | null | undefined): string | null {
  const normalized = trim(value);
  if (!normalized) return null;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function resolveConfiguredHasuraGraphqlUrl(): string | null {
  if (configuredHasuraGraphqlUrl) return configuredHasuraGraphqlUrl;
  if (typeof globalThis !== "undefined") {
    const globalUrl = (globalThis as { __YURBRAIN_HASURA_GRAPHQL_URL?: unknown }).__YURBRAIN_HASURA_GRAPHQL_URL;
    if (typeof globalUrl === "string") {
      const normalized = trimGraphqlUrl(globalUrl);
      if (normalized) return normalized;
    }
  }
  if (typeof process !== "undefined" && process.env) {
    return trimGraphqlUrl(
      process.env.YURBRAIN_HASURA_GRAPHQL_URL ??
        process.env.NEXT_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL ??
        process.env.EXPO_PUBLIC_YURBRAIN_HASURA_GRAPHQL_URL
    );
  }
  return null;
}

function resolveConfiguredHasuraAdminSecret(): string | null {
  if (configuredHasuraAdminSecret) return configuredHasuraAdminSecret;
  if (typeof globalThis !== "undefined") {
    const globalSecret = (globalThis as { __YURBRAIN_HASURA_ADMIN_SECRET?: unknown }).__YURBRAIN_HASURA_ADMIN_SECRET;
    if (typeof globalSecret === "string") {
      const normalized = trim(globalSecret);
      if (normalized) return normalized;
    }
  }
  if (typeof process !== "undefined" && process.env) {
    return trim(
      process.env.YURBRAIN_HASURA_ADMIN_SECRET
    );
  }
  return null;
}

function resolveConfiguredHasuraRole(): string {
  if (configuredHasuraRole) return configuredHasuraRole;
  if (typeof globalThis !== "undefined") {
    const globalRole = (globalThis as { __YURBRAIN_HASURA_ROLE?: unknown }).__YURBRAIN_HASURA_ROLE;
    if (typeof globalRole === "string") {
      const normalized = trim(globalRole);
      if (normalized) return normalized;
    }
  }
  if (typeof process !== "undefined" && process.env) {
    const envRole = trim(
      process.env.YURBRAIN_HASURA_ROLE ??
        process.env.NEXT_PUBLIC_YURBRAIN_HASURA_ROLE ??
        process.env.EXPO_PUBLIC_YURBRAIN_HASURA_ROLE
    );
    if (envRole) return envRole;
  }
  return "user";
}

export function configureHasuraGraphqlUrl(url: string | null | undefined) {
  configuredHasuraGraphqlUrl = trimGraphqlUrl(url);
}

export function configureHasuraAdminSecret(secret: string | null | undefined) {
  configuredHasuraAdminSecret = trim(secret);
}

export function configureHasuraRole(role: string | null | undefined) {
  configuredHasuraRole = trim(role);
}

export function isHasuraGraphqlConfigured(): boolean {
  return Boolean(resolveConfiguredHasuraGraphqlUrl());
}

export async function hasuraGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const endpoint = resolveConfiguredHasuraGraphqlUrl();
  if (!endpoint) {
    throw new HasuraGraphqlClientError("Hasura GraphQL endpoint is not configured", {
      code: "HASURA_GRAPHQL_NOT_CONFIGURED"
    });
  }

  const headers = new Headers({ "content-type": "application/json" });
  const adminSecret = resolveConfiguredHasuraAdminSecret();
  if (adminSecret) {
    headers.set("x-hasura-admin-secret", adminSecret);
  }

  const currentUserId = getConfiguredCurrentUserId();
  if (currentUserId) {
    headers.set("x-hasura-user-id", currentUserId);
    headers.set("x-hasura-role", resolveConfiguredHasuraRole());
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new HasuraGraphqlClientError(toStatusFallbackMessage(response.status), {
      statusCode: response.status,
      code: "HASURA_GRAPHQL_HTTP_ERROR"
    });
  }

  const body = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    throw new HasuraGraphqlClientError("Unable to complete this request right now.", {
      code: "HASURA_GRAPHQL_ERROR"
    });
  }

  if (body.data === undefined) {
    throw new HasuraGraphqlClientError("GraphQL request returned no data", {
      code: "HASURA_GRAPHQL_NO_DATA"
    });
  }

  return body.data;
}
