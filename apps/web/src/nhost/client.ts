"use client";

import { createWebNhostClientFromEnv } from "@yurbrain/nhost";

let cachedNhostClient: ReturnType<typeof createWebNhostClientFromEnv> | null = null;

export function getWebNhostClient() {
  if (cachedNhostClient) return cachedNhostClient;

  // Resolve from explicit NEXT_PUBLIC values to avoid relying on runtime
  // process.env object shape in browser bundles.
  cachedNhostClient = createWebNhostClientFromEnv({
    NEXT_PUBLIC_NHOST_SUBDOMAIN: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN,
    NEXT_PUBLIC_NHOST_REGION: process.env.NEXT_PUBLIC_NHOST_REGION,
    NEXT_PUBLIC_NHOST_BACKEND_URL: process.env.NEXT_PUBLIC_NHOST_BACKEND_URL,
    NEXT_PUBLIC_NHOST_AUTH_URL: process.env.NEXT_PUBLIC_NHOST_AUTH_URL,
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL,
    NEXT_PUBLIC_NHOST_STORAGE_URL: process.env.NEXT_PUBLIC_NHOST_STORAGE_URL,
    NEXT_PUBLIC_NHOST_FUNCTIONS_URL: process.env.NEXT_PUBLIC_NHOST_FUNCTIONS_URL,
    NEXT_PUBLIC_NHOST_ANON_KEY: process.env.NEXT_PUBLIC_NHOST_ANON_KEY
  });
  return cachedNhostClient;
}
