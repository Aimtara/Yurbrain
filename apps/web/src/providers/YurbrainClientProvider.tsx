"use client";

import type { ReactNode } from "react";
import { YurbrainClientProvider as SharedYurbrainClientProvider, yurbrainClient } from "@yurbrain/client";

type Props = {
  children: ReactNode;
};

export function YurbrainClientProvider({ children }: Props) {
  return (
    <SharedYurbrainClientProvider client={yurbrainClient}>
      {children}
    </SharedYurbrainClientProvider>
  );
}
