"use client";

import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getMobileNhostClient } from "./client";

type MobileNhostClient = ReturnType<typeof getMobileNhostClient>;

const MobileNhostContext = createContext<MobileNhostClient | null>(null);

export function MobileNhostProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => getMobileNhostClient(), []);
  return <MobileNhostContext.Provider value={value}>{children}</MobileNhostContext.Provider>;
}

export function useMobileNhostClient(): MobileNhostClient {
  const client = useContext(MobileNhostContext);
  if (!client) {
    throw new Error("useMobileNhostClient must be used within MobileNhostProvider");
  }
  return client;
}
