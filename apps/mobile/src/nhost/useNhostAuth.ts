"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { syncAuthenticatedTokenOnlySession } from "@yurbrain/client";
import { toUserSafeNhostAuthMessage } from "@yurbrain/nhost";
import { useMobileNhostClient } from "./provider";
import { resolveMobileNhostAuthConfig } from "./auth-config";
import { hydrateMobileNhostSessionStorage } from "./storage";

type MobileNhostClient = NonNullable<ReturnType<typeof useMobileNhostClient>>;
type Session = ReturnType<MobileNhostClient["getUserSession"]>;

type AuthState = {
  session: Session | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isInitializing: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
};

type AuthActions = {
  signUp: (email: string, password: string) => Promise<{ success: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean }>;
  signOut: () => Promise<{ success: boolean }>;
  refreshSession: () => Promise<{ success: boolean }>;
  sendVerificationEmail: (email?: string) => Promise<{ success: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean }>;
};

export type MobileNhostAuth = AuthState &
  AuthActions & {
    nhost: ReturnType<NonNullable<typeof useMobileNhostClient>>;
    getSession: () => Session | null;
  };

function toErrorMessage(error: unknown, fallback: string): string {
  return toUserSafeNhostAuthMessage(error, fallback);
}

function assertFetchSuccess(
  response: { status?: number; body?: unknown } | null | undefined,
  fallback: string
) {
  if (!response) {
    throw new Error(fallback);
  }
  if (typeof response.status === "number" && response.status >= 400) {
    const body = response.body;
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : fallback;
    throw new Error(message);
  }
}

export function useNhostAuth(): MobileNhostAuth {
  const nhost = useMobileNhostClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const syncSessionState = useCallback(
    (nextSession: Session | null) => {
      syncAuthenticatedTokenOnlySession(nextSession);
      setSession(nextSession);
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await hydrateMobileNhostSessionStorage();
        if (!nhost) {
          syncSessionState(null);
          return;
        }
        await nhost.refreshSession(0).catch(() => {
          // Ignore refresh failures during bootstrap and fall back to stored session.
        });
        syncSessionState(nhost.getUserSession());
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [nhost, syncSessionState]);

  useEffect(() => {
    if (!nhost) {
      syncSessionState(null);
      return;
    }
    syncSessionState(nhost.getUserSession());
  }, [nhost, syncSessionState]);

  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        return await operation();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string) =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const { emailVerificationRedirectTo } = resolveMobileNhostAuthConfig();
        const result = await nhost.auth.signUpEmailPassword({
          email,
          password,
          options: {
            redirectTo: emailVerificationRedirectTo
          }
        });
        assertFetchSuccess(result, "Unable to create account right now.");
        syncSessionState(nhost.getUserSession());
        return { success: true };
      }).catch((authError) => {
        const message = toErrorMessage(authError, "Unable to create account right now.");
        setError(message);
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  const signIn = useCallback(
    async (email: string, password: string) =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const result = await nhost.auth.signInEmailPassword({
          email,
          password
        });
        assertFetchSuccess(result, "Unable to sign in right now.");
        syncSessionState(nhost.getUserSession());
        return { success: true };
      }).catch((authError) => {
        const message = toErrorMessage(authError, "Unable to sign in right now.");
        setError(message);
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  const signOut = useCallback(
    async () =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const current = nhost.getUserSession();
        let signOutError: unknown = null;
        try {
          const result = await nhost.auth.signOut({
            refreshToken: current?.refreshToken,
            all: false
          });
          assertFetchSuccess(result, "Unable to sign out right now.");
        } catch (caught) {
          signOutError = caught;
        } finally {
          nhost.clearSession();
          syncSessionState(null);
        }
        if (signOutError) {
          throw signOutError;
        }
        return { success: true };
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to sign out right now."));
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  const refreshSession = useCallback(
    async () =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        await nhost.refreshSession(0);
        syncSessionState(nhost.getUserSession());
        return { success: true };
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to refresh session right now."));
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  const sendVerificationEmail = useCallback(
    async (email?: string) =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const { emailVerificationRedirectTo } = resolveMobileNhostAuthConfig();
        const targetEmail = email ?? nhost.getUserSession()?.user?.email;
        if (!targetEmail) {
          throw new Error("Email is required.");
        }
        const result = await nhost.auth.sendVerificationEmail({
          email: targetEmail,
          options: {
            redirectTo: emailVerificationRedirectTo
          }
        });
        assertFetchSuccess(result, "Unable to send verification email right now.");
        return { success: true };
      }).catch((authError) => {
        setError(
          toErrorMessage(authError, "Unable to send verification email right now.")
        );
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  const requestPasswordReset = useCallback(
    async (email: string) =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const { passwordResetRedirectTo } = resolveMobileNhostAuthConfig();
        const result = await nhost.auth.sendPasswordResetEmail({
          email,
          options: {
            redirectTo: passwordResetRedirectTo
          }
        });
        assertFetchSuccess(result, "Unable to request password reset right now.");
        return { success: true };
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to request password reset right now."));
        return { success: false };
      }),
    [nhost, syncSessionState, withLoading]
  );

  return useMemo(
    () => ({
      nhost,
      getSession: () => session,
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isEmailVerified: Boolean(session?.user?.emailVerified ?? session?.user?.email_verified),
      isInitializing,
      loading,
      error,
      clearError,
      signUp,
      signIn,
      signOut,
      refreshSession,
      sendVerificationEmail,
      requestPasswordReset
    }),
    [
      clearError,
      error,
      isInitializing,
      loading,
      nhost,
      refreshSession,
      requestPasswordReset,
      sendVerificationEmail,
      session,
      signIn,
      signOut,
      signUp
    ]
  );
}
