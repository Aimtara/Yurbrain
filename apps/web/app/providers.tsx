"use client";

import type { ReactNode } from "react";
import { NhostProvider } from "@nhost/react";

import { nhost } from "../src/lib/nhost";

export function Providers({ children }: { children: ReactNode }) {
  return <NhostProvider nhost={nhost as never}>{children}</NhostProvider>;
}
