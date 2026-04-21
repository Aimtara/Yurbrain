"use client";

import type { NhostClient } from "@nhost/nhost-js";
import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getWebNhostClient } from "./client";

const WebNhostContext = createContext<NhostClient | null>(null);

export function WebNhostProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => getWebNhostClient(), []);
  return <WebNhostContext.Provider value={value}>{children}</WebNhostContext.Provider>;
}

export function useWebNhostClient(): NhostClient {
  const client = useContext(WebNhostContext);
  if (!client) {
    throw new Error("useWebNhostClient must be used within WebNhostProvider");
  }
  return client;
}
