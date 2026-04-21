"use client";

import { createWebNhostClientFromEnv } from "@yurbrain/nhost";

let cachedNhostClient: ReturnType<typeof createWebNhostClientFromEnv> | null = null;

export function getWebNhostClient() {
  if (cachedNhostClient) return cachedNhostClient;
  cachedNhostClient = createWebNhostClientFromEnv();
  return cachedNhostClient;
}
