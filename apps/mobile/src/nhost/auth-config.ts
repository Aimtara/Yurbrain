"use client";

export type MobileNhostAuthConfig = {
  signInRedirectTo?: string;
  signOutRedirectTo?: string;
  passwordResetRedirectTo?: string;
  emailVerificationRedirectTo?: string;
};

function trimValue(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function removeTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function ensureAbsoluteUrl(value: string | undefined, keyName: string): string | undefined {
  if (!value) return undefined;
  const normalized = removeTrailingSlash(value);
  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    throw new Error(`[nhost] ${keyName} must be an absolute URL.`);
  }
}

function resolveFirst(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = trimValue(process.env[key]);
    if (value) return value;
  }
  return undefined;
}

export function resolveMobileNhostAuthConfig(): MobileNhostAuthConfig {
  const appUrl = ensureAbsoluteUrl(
    resolveFirst([
      "EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL",
      "EXPO_PUBLIC_APP_URL",
      "EXPO_PUBLIC_SITE_URL"
    ]),
    "EXPO_PUBLIC_NHOST_MOBILE_DEEP_LINK_BASE_URL"
  );

  const signInRedirectTo = ensureAbsoluteUrl(
    resolveFirst(["EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL"]) ?? appUrl,
    "EXPO_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL"
  );
  const signOutRedirectTo = ensureAbsoluteUrl(
    resolveFirst(["EXPO_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL"]) ?? appUrl,
    "EXPO_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL"
  );
  const passwordResetRedirectTo = ensureAbsoluteUrl(
    resolveFirst(["EXPO_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL"]) ?? appUrl,
    "EXPO_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL"
  );
  const emailVerificationRedirectTo = ensureAbsoluteUrl(
    resolveFirst(["EXPO_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL"]) ?? appUrl,
    "EXPO_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL"
  );

  return {
    signInRedirectTo,
    signOutRedirectTo,
    passwordResetRedirectTo,
    emailVerificationRedirectTo
  };
}
