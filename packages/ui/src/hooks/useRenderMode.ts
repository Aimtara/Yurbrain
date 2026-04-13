import { useMemo } from "react";
import type { ThemeMode } from "../design/theme";

export function useRenderMode(preferred?: ThemeMode): ThemeMode {
  return useMemo(() => preferred ?? "dark", [preferred]);
}
