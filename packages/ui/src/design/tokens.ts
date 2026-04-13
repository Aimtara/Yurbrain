export const tokens = {
  colors: {
    bg: "#0f1115",
    panel: "#181c24",
    text: "#f3f5f9",
    muted: "#9aa4b2",
    accent: "#7dd3fc"
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24
  },
  radius: {
    sm: 8,
    md: 12
  }
} as const;

export type Tokens = typeof tokens;
