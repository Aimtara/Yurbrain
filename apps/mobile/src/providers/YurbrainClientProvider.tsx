"use client";

import { YurbrainClientProvider as SharedYurbrainClientProvider, setNhostClientFactory } from "@yurbrain/client";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { getMobileNhostClient } from "../nhost/client";
import { MobileNhostProvider } from "../nhost/provider";

function MobileNhostBridge() {
  useEffect(() => {
    setNhostClientFactory(getMobileNhostClient);
    return () => {
      setNhostClientFactory(null);
    };
  }, []);
  return null;
}

export function YurbrainClientProvider({ children }: PropsWithChildren) {
  return (
    <MobileNhostProvider>
      <MobileNhostBridge />
      <SharedYurbrainClientProvider options={{ transport: "nhost" }}>
        {children}
      </SharedYurbrainClientProvider>
    </MobileNhostProvider>
  );
}
