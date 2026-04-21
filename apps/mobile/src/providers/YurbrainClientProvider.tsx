"use client";

import { YurbrainClientProvider as SharedYurbrainClientProvider } from "@yurbrain/client";
import type { PropsWithChildren } from "react";

export function YurbrainClientProvider({ children }: PropsWithChildren) {
  return (
    <SharedYurbrainClientProvider options={{ transport: "nhost" }}>
      {children}
    </SharedYurbrainClientProvider>
  );
}
