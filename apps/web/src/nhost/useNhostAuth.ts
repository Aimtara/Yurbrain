"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { syncAuthenticatedTokenOnlySession } from "@yurbrain/client";
import { toUserSafeNhostAuthMessage } from "@yurbrain/nhost";
import { useWebNhostClient } from "./provider";
import { getWebAuthRedirectConfig } from "./auth-config";

type SessionLike = {
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    emailVerified?: boolean;
    email_verified?: boolean;
  };
  decodedToken?: {
    sub?: string;
  };
} | null;

function toErrorMessage(caught: unknown, fallback: string): string {
  return toUserSafeNhostAuthMessage(caught, fallback);
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
    syncAuthenticatedTokenOnlySession(nextSession);
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
        }, "Unable to create account right now."),
      signIn: (email: string, password: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          await nhost.auth.signOut({});
          const result = await nhost.auth.signInEmailPassword({
            email,
            password
          });
          syncSessionState();
          return result;
        }, "Unable to sign in right now."),
      signOut: () =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          let result: unknown = null;
          let signOutError: unknown = null;
          try {
            result = await nhost.auth.signOut({});
          } catch (caught) {
            signOutError = caught;
          } finally {
            nhost.clearSession();
            syncSessionState();
          }
          if (signOutError) {
            throw signOutError;
          }
          return result;
        }, "Unable to sign out right now."),
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
        }, "Unable to request password reset right now."),
      sendVerificationEmail: (email?: string) =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const config = getWebAuthRedirectConfig();
          const targetEmail = email ?? nhost.getUserSession()?.user?.email;
          if (!targetEmail) {
            throw new Error("Email is required.");
          }
          return nhost.auth.sendVerificationEmail({
            email: targetEmail,
            options: {
              redirectTo: config.emailVerificationRedirectTo
            }
          });
        }, "Unable to send verification email right now."),
      refreshSession: () =>
        withErrorHandling(async () => {
          if (!nhost) throw new Error("Nhost client is not initialized");
          const refreshed = await nhost.refreshSession(0);
          syncSessionState();
          return refreshed;
        }, "Unable to refresh session right now.")
    }),
    [nhost, loading, error, isAuthenticated, isEmailVerified, session, syncSessionState]
  );
}
