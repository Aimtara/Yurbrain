"use client";

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { getWebNhostClient } from "./client";

type WebNhostClient = ReturnType<typeof getWebNhostClient>;

const WebNhostContext = createContext<WebNhostClient | null>(null);

export function WebNhostProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<WebNhostClient | null>(null);

  useEffect(() => {
    setClient(getWebNhostClient());
  }, []);

  return <WebNhostContext.Provider value={client}>{children}</WebNhostContext.Provider>;
}

export function useWebNhostClient(): WebNhostClient | null {
  return useContext(WebNhostContext);
}
