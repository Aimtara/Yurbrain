"use client";

import type { NhostClient } from "@nhost/nhost-js";
import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getMobileNhostClient } from "./client";

const MobileNhostContext = createContext<NhostClient | null>(null);

export function MobileNhostProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => getMobileNhostClient(), []);
  return <MobileNhostContext.Provider value={value}>{children}</MobileNhostContext.Provider>;
}

export function useMobileNhostClient(): NhostClient {
  const client = useContext(MobileNhostContext);
  if (!client) {
    throw new Error("useMobileNhostClient must be used within MobileNhostProvider");
  }
  return client;
}
