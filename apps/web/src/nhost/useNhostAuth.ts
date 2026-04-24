"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebNhostClient } from "./provider";
import { getWebAuthRedirectConfig } from "./auth-config";

type SessionLike = {
  accessToken?: string;
  user?: {
    email?: string;
    emailVerified?: boolean;
    email_verified?: boolean;
  };
} | null;

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message.trim().length > 0) {
    return caught.message;
  }
  if (typeof caught === "object" && caught && "body" in caught) {
    const body = (caught as { body?: { message?: unknown } }).body;
    if (body && typeof body.message === "string" && body.message.trim().length > 0) {
      return body.message;
    }
  }
  return fallback;
}

export function useNhostAuth() {
  const nhost = useWebNhostClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [session, setSession] = useState<SessionLike>(null);

  const syncSessionState = useCallback(() => {
    const nextSession = (nhost?.getUserSession() ?? null) as SessionLike;
    setSession(nextSession);
    const authenticated = Boolean(nextSession?.accessToken);
    setIsAuthenticated(authenticated);
    const verified = authenticated
      ? Boolean(nextSession?.user?.emailVerified ?? nextSession?.user?.email_verified)
      : false;
    setIsEmailVerified(verified);
  }, [nhost]);

  useEffect(() => {
    if (!nhost) {
      syncSessionState();
      setLoading(false);
      return;
    }
    setLoading(true);
    void nhost
      .refreshSession(0)
      .catch(() => {
        // Best-effort refresh. Session may already be valid or absent.
      })
      .finally(() => {
        syncSessionState();
        setLoading(false);
      });
  }, [nhost, syncSessionState]);

  const withErrorHandling = async <T,>(
    operation: () => Promise<T>,
    fallbackMessage: string
  ): Promise<T> => {
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(toErrorMessage(caught, fallbackMessage));
      throw caught;
    }
  };

  return useMemo(
    () => ({
      nhost,
      loading,
      error,
      getSession: () => nhost?.getUserSession() ?? null,
      session,
      isAuthenticated,
      isEmailVerified,
      isReady: !loading,
      clearAuthError: () => setError(null),
      signUp: (email: string, password: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const config = getWebAuthRedirectConfig();
          const result = await nhost.auth.signUpEmailPassword({
            email,
            password,
            options: {
              redirectTo: config.emailVerificationRedirectTo
            }
          });
          syncSessionState();
          return result;
        }, "Failed to sign up."),
      signIn: (email: string, password: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const result = await nhost.auth.signInEmailPassword({
            email,
            password
          });
          syncSessionState();
          return result;
        }, "Failed to sign in."),
      signOut: () =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const result = await nhost.auth.signOut({});
          nhost.clearSession();
          syncSessionState();
          return result;
        }, "Failed to sign out."),
      requestPasswordReset: (email: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const config = getWebAuthRedirectConfig();
          return nhost.auth.sendPasswordResetEmail({
            email,
            options: {
              redirectTo: config.passwordResetRedirectTo
            }
          });
        }, "Failed to request password reset."),
      sendVerificationEmail: (email?: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const config = getWebAuthRedirectConfig();
          const targetEmail = email ?? nhost.getUserSession()?.user?.email;
          if (!targetEmail) {
            throw new Error("An email is required to send verification.");
          }
          return nhost.auth.sendVerificationEmail({
            email: targetEmail,
            options: {
              redirectTo: config.emailVerificationRedirectTo
            }
          });
        }, "Failed to send verification email."),
      refreshSession: () =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const refreshed = await nhost.refreshSession(0);
          syncSessionState();
          return refreshed;
        }, "Failed to refresh session.")
    }),
    [nhost, loading, error, isAuthenticated, isEmailVerified, session, syncSessionState]
  );
}
