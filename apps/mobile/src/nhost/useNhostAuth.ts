"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toUserSafeNhostAuthMessage } from "@yurbrain/nhost";
import { useMobileNhostClient } from "./provider";
import { resolveMobileNhostAuthConfig } from "./auth-config";
import { hydrateMobileNhostSessionStorage } from "./storage";

type MobileNhostClient = NonNullable<ReturnType<typeof useMobileNhostClient>>;
type Session = ReturnType<MobileNhostClient["getUserSession"]>;

type AuthState = {
  session: Session | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
};

type AuthActions = {
  signUp: (email: string, password: string) => Promise<{ success: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
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

  useEffect(() => {
    let mounted = true;
    void hydrateMobileNhostSessionStorage().finally(() => {
      if (!mounted) return;
      if (nhost) {
        setSession(nhost.getUserSession());
      } else {
        setSession(null);
      }
      setIsInitializing(false);
    });
    return () => {
      mounted = false;
    };
  }, [nhost]);

  useEffect(() => {
    if (!nhost) return;
    setSession(nhost.getUserSession());
  }, [nhost]);

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
        setSession(nhost.getUserSession());
        return { success: true };
      }).catch((authError) => {
        const message = toErrorMessage(authError, "Unable to create account right now.");
        setError(message);
        return { success: false };
      }),
    [nhost, withLoading]
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
        setSession(nhost.getUserSession());
        return { success: true };
      }).catch((authError) => {
        const message = toErrorMessage(authError, "Unable to sign in right now.");
        setError(message);
        return { success: false };
      }),
    [nhost, withLoading]
  );

  const signOut = useCallback(
    async () =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        const current = nhost.getUserSession();
        const result = await nhost.auth.signOut({
          refreshToken: current?.refreshToken,
          all: false
        });
        assertFetchSuccess(result, "Unable to sign out right now.");
        nhost.clearSession();
        setSession(null);
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to sign out right now."));
      }),
    [nhost, withLoading]
  );

  const refreshSession = useCallback(
    async () =>
      withLoading(async () => {
        if (!nhost) {
          throw new Error("Nhost client is not available yet.");
        }
        await nhost.refreshSession(0);
        setSession(nhost.getUserSession());
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to refresh session right now."));
      }),
    [nhost, withLoading]
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
      }).catch((authError) => {
        setError(
          toErrorMessage(authError, "Unable to send verification email right now.")
        );
      }),
    [nhost, withLoading]
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
      }).catch((authError) => {
        setError(toErrorMessage(authError, "Unable to request password reset right now."));
      }),
    [nhost, withLoading]
  );

  return useMemo(
    () => ({
      nhost,
      getSession: () => session,
      session,
      isAuthenticated: Boolean(session),
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
