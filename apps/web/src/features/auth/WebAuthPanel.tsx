"use client";

import { useMemo, useState } from "react";
import type { useNhostAuth } from "../../nhost/useNhostAuth";

type WebAuthState = ReturnType<typeof useNhostAuth>;

type Props = {
  auth: WebAuthState;
};

type AuthMode = "sign_in" | "sign_up" | "reset_password";

export function WebAuthPanel({ auth }: Props) {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const canSubmitSignIn = trimmedEmail.length > 0 && password.length > 0;
  const canSubmitSignUp =
    trimmedEmail.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;
  const canSubmitReset = trimmedEmail.length > 0;

  const clearTransientState = () => {
    setNotice("");
    auth.clearAuthError();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearTransientState();
  };

  const handleSignIn = async () => {
    if (!canSubmitSignIn) return;
    setSubmitting(true);
    clearTransientState();
    try {
      await auth.signIn(trimmedEmail, password);
      setNotice("Signed in successfully.");
    } catch {
      // Hook sets user-safe error.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!canSubmitSignUp) return;
    setSubmitting(true);
    clearTransientState();
    try {
      await auth.signUp(trimmedEmail, password);
      setNotice("Account created. Check your inbox for verification instructions.");
      setMode("sign_in");
      setPassword("");
      setConfirmPassword("");
    } catch {
      // Hook sets user-safe error.
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!canSubmitReset) return;
    setSubmitting(true);
    clearTransientState();
    try {
      await auth.requestPasswordReset(trimmedEmail);
      setNotice("Password reset email sent if the address is registered.");
      setMode("sign_in");
    } catch {
      // Hook sets user-safe error.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      style={{
        margin: "0 auto",
        maxWidth: "560px",
        borderRadius: "16px",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        padding: "20px",
        color: "#1e293b",
        display: "grid",
        gap: "14px"
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: "22px", lineHeight: "30px" }}>
          Sign in to Yurbrain
        </h1>
        <p style={{ margin: "6px 0 0", color: "#475569" }}>
          Use your Nhost account to continue.
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => switchMode("sign_in")} disabled={submitting || mode === "sign_in"}>
          Sign in
        </button>
        <button type="button" onClick={() => switchMode("sign_up")} disabled={submitting || mode === "sign_up"}>
          Sign up
        </button>
        <button
          type="button"
          onClick={() => switchMode("reset_password")}
          disabled={submitting || mode === "reset_password"}
        >
          Reset password
        </button>
      </div>

      <label style={{ display: "grid", gap: "4px" }}>
        <span style={{ fontWeight: 700 }}>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={submitting}
          style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "10px 12px" }}
        />
      </label>

      {mode !== "reset_password" ? (
        <label style={{ display: "grid", gap: "4px" }}>
          <span style={{ fontWeight: 700 }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            disabled={submitting}
            style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "10px 12px" }}
          />
        </label>
      ) : null}

      {mode === "sign_up" ? (
        <label style={{ display: "grid", gap: "4px" }}>
          <span style={{ fontWeight: 700 }}>Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="••••••••"
            disabled={submitting}
            style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "10px 12px" }}
          />
          {confirmPassword.length > 0 && password !== confirmPassword ? (
            <span style={{ color: "#b91c1c", fontSize: "13px" }}>
              Passwords do not match.
            </span>
          ) : null}
        </label>
      ) : null}

      {mode === "sign_in" ? (
        <button type="button" onClick={() => void handleSignIn()} disabled={submitting || !canSubmitSignIn}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      ) : null}

      {mode === "sign_up" ? (
        <button type="button" onClick={() => void handleSignUp()} disabled={submitting || !canSubmitSignUp}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      ) : null}

      {mode === "reset_password" ? (
        <button
          type="button"
          onClick={() => void handlePasswordReset()}
          disabled={submitting || !canSubmitReset}
        >
          {submitting ? "Sending reset..." : "Send password reset"}
        </button>
      ) : null}

      {auth.error ? (
        <p style={{ margin: 0, color: "#991b1b" }}>{auth.error}</p>
      ) : null}
      {notice ? (
        <p style={{ margin: 0, color: "#0f766e" }}>{notice}</p>
      ) : null}
    </section>
  );
}
