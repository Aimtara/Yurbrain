import { createMobileNhostClientFromEnv } from "@yurbrain/nhost";
import { createMobileNhostSessionStorage } from "./storage";

let cachedNhostClient: ReturnType<typeof createMobileNhostClientFromEnv> | null = null;

export function getMobileNhostClient() {
  if (cachedNhostClient) return cachedNhostClient;
  cachedNhostClient = createMobileNhostClientFromEnv(undefined, {
    storage: createMobileNhostSessionStorage()
  });
  return cachedNhostClient;
}
