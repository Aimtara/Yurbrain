"use client";

import { YurbrainClientProvider as SharedYurbrainClientProvider, yurbrainClient } from "@yurbrain/client";
import type { PropsWithChildren } from "react";

export function YurbrainClientProvider({ children }: PropsWithChildren) {
  return (
    <SharedYurbrainClientProvider client={yurbrainClient}>
      {children}
    </SharedYurbrainClientProvider>
  );
}
