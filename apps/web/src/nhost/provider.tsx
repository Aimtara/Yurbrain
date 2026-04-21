"use client";

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { getWebNhostClient } from "./client";

type WebNhostClient = ReturnType<typeof getWebNhostClient>;

const WebNhostContext = createContext<WebNhostClient | null>(null);

export function WebNhostProvider({ children }: PropsWithChildren) {
  const [value, setValue] = useState<WebNhostClient | null>(null);

  useEffect(() => {
    setValue(getWebNhostClient());
  }, []);

  return <WebNhostContext.Provider value={value}>{children}</WebNhostContext.Provider>;
}

export function useWebNhostClient(): WebNhostClient {
  const client = useContext(WebNhostContext);
  if (!client) {
    throw new Error("useWebNhostClient must be used within WebNhostProvider");
  }
  return client;
}
