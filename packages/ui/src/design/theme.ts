import { tokens } from "./tokens";

export const theme = {
  light: tokens,
  dark: tokens
} as const;

export type ThemeMode = keyof typeof theme;
