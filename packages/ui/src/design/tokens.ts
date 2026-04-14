export const tokens = {
  colors: {
    bg: "#f8fafc",
    panel: "#ffffff",
    text: "#0f172a",
    muted: "#475569",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
    accentSurface: "#eff6ff",
    warning: "#b45309",
    warningSoft: "#fef3c7",
    success: "#0f766e",
    successSoft: "#ccfbf1",
    border: "#e2e8f0"
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 12,
    md: 20,
    lg: 24
  }
} as const;

export type Tokens = typeof tokens;
