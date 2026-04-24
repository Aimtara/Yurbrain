"use client";

type RedirectConfig = {
  signInRedirectTo: string;
  signOutRedirectTo: string;
  emailVerificationRedirectTo: string;
  passwordResetRedirectTo: string;
};

function trim(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getCurrentOrigin(): string {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }
  return window.location.origin;
}

function resolvePath(pathOrUrl: string | null, origin: string): string {
  if (!pathOrUrl) return origin;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const prefixed = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${prefixed}`;
}

export function getWebAuthRedirectConfig(): RedirectConfig {
  const configuredOrigin = trim(process.env.NEXT_PUBLIC_NHOST_APP_ORIGIN);
  const origin = resolvePath(configuredOrigin, getCurrentOrigin());
  const signInRedirectUrl = trim(process.env.NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_URL);
  const signOutRedirectUrl = trim(process.env.NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_URL);
  const emailVerificationRedirectUrl = trim(
    process.env.NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_URL
  );
  const passwordResetRedirectUrl = trim(
    process.env.NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_URL
  );
  const signInRedirectPath = trim(process.env.NEXT_PUBLIC_NHOST_SIGN_IN_REDIRECT_PATH);
  const signOutRedirectPath = trim(process.env.NEXT_PUBLIC_NHOST_SIGN_OUT_REDIRECT_PATH);
  const emailVerificationRedirectPath = trim(
    process.env.NEXT_PUBLIC_NHOST_EMAIL_VERIFICATION_REDIRECT_PATH
  );
  const passwordResetRedirectPath = trim(
    process.env.NEXT_PUBLIC_NHOST_PASSWORD_RESET_REDIRECT_PATH
  );

  return {
    signInRedirectTo: resolvePath(signInRedirectUrl ?? signInRedirectPath ?? "/", origin),
    signOutRedirectTo: resolvePath(signOutRedirectUrl ?? signOutRedirectPath ?? "/", origin),
    emailVerificationRedirectTo: resolvePath(
      emailVerificationRedirectUrl ?? emailVerificationRedirectPath ?? "/auth/verify",
      origin
    ),
    passwordResetRedirectTo: resolvePath(
      passwordResetRedirectUrl ?? passwordResetRedirectPath ?? "/auth/reset-password",
      origin
    )
  };
}
