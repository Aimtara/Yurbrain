"use client";

import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getMobileNhostClient } from "./client";

type MobileNhostClient = ReturnType<typeof getMobileNhostClient>;

const MobileNhostContext = createContext<MobileNhostClient | null>(null);

export function MobileNhostProvider({ children }: PropsWithChildren) {
  const value = useMemo(() => getMobileNhostClient(), []);
  return <MobileNhostContext.Provider value={value}>{children}</MobileNhostContext.Provider>;
}

export function useMobileNhostClient(): MobileNhostClient | null {
  return useContext(MobileNhostContext);
}
