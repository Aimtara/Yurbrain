"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createYurbrainClient, type CreateYurbrainClientOptions, type YurbrainClient, yurbrainClient } from "@yurbrain/client";

type Props = {
  children: ReactNode;
  client?: YurbrainClient;
  options?: CreateYurbrainClientOptions;
};

const YurbrainClientContext = createContext<YurbrainClient>(yurbrainClient);

export function YurbrainClientProvider({ children, client, options }: Props) {
  const resolvedClient = useMemo(() => {
    if (client) return client;
    if (options) return createYurbrainClient(options);
    return yurbrainClient;
  }, [client, options]);

  return (
    <YurbrainClientContext.Provider value={resolvedClient}>
      {children}
    </YurbrainClientContext.Provider>
  );
}

export function useYurbrainClient(): YurbrainClient {
  return useContext(YurbrainClientContext);
}
