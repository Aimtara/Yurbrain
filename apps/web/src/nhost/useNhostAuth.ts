"use client";

import { useMemo } from "react";
import { useWebNhostClient } from "./provider";

export function useNhostAuth() {
  const nhost = useWebNhostClient();
  return useMemo(
    () => ({
      nhost,
      getSession: () => nhost?.getUserSession() ?? null,
      isAuthenticated: Boolean(nhost?.getUserSession())
    }),
    [nhost]
  );
}
