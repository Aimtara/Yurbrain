import { createClient } from "@nhost/nhost-js";
import {
  configureAccessToken,
  configureCurrentUserId
} from "../api/client";

declare const process:
  | {
      env?: {
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

function resolveEnvValue(keys: string[]): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  for (const key of keys) {
    const value = process.env[key as keyof typeof process.env];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function resolveNhostOptions() {
  const subdomain = resolveEnvValue(["NEXT_PUBLIC_NHOST_SUBDOMAIN", "EXPO_PUBLIC_NHOST_SUBDOMAIN"]);
  const region = resolveEnvValue(["NEXT_PUBLIC_NHOST_REGION", "EXPO_PUBLIC_NHOST_REGION"]);
  const authUrl = resolveEnvValue(["NEXT_PUBLIC_NHOST_AUTH_URL", "EXPO_PUBLIC_NHOST_AUTH_URL"]);
  const graphqlUrl = resolveEnvValue(["NEXT_PUBLIC_NHOST_GRAPHQL_URL", "EXPO_PUBLIC_NHOST_GRAPHQL_URL"]);
  const functionsUrl = resolveEnvValue(["NEXT_PUBLIC_NHOST_FUNCTIONS_URL", "EXPO_PUBLIC_NHOST_FUNCTIONS_URL"]);

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

  const options = resolveNhostOptions();
  if (!options) {
    cachedConfigured = false;
    return { configured: false };
  }
  cachedConfigured = true;

  const nhost = createClient(options);
  const session = nhost.getUserSession();
  if (!session) {
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
