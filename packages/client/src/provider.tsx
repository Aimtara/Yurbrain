"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren
} from "react";
import {
  createYurbrainClient,
  type CreateYurbrainClientOptions,
  type YurbrainClient
} from "./createYurbrainClient";
import { yurbrainClient as defaultYurbrainClient } from "./yurbrainClient";

const YurbrainClientContext = createContext<YurbrainClient>(defaultYurbrainClient);

export type YurbrainClientProviderProps = PropsWithChildren<{
  client?: YurbrainClient;
  options?: CreateYurbrainClientOptions;
}>;

export function YurbrainClientProvider({
  children,
  client,
  options
}: YurbrainClientProviderProps) {
  const resolvedClient = useMemo(() => {
    if (client) return client;
    if (options) return createYurbrainClient(options);
    return defaultYurbrainClient;
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
