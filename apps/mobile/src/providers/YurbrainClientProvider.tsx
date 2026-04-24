"use client";

import { YurbrainClientProvider as SharedYurbrainClientProvider } from "@yurbrain/client";
import type { PropsWithChildren } from "react";
import { MobileNhostProvider } from "../nhost/provider";

export function YurbrainClientProvider({ children }: PropsWithChildren) {
  return (
    <MobileNhostProvider>
      <SharedYurbrainClientProvider options={{ transport: "nhost" }}>
        {children}
      </SharedYurbrainClientProvider>
    </MobileNhostProvider>
  );
}
