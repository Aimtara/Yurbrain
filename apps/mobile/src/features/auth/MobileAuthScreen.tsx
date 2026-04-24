"use client";

import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import type { MobileNhostAuth } from "../../nhost/useNhostAuth";

type Props = {
  auth: MobileNhostAuth;
};

type AuthMode = "sign_in" | "sign_up" | "reset_password";

function ActionButton({
  label,
  onPress,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 10,
        backgroundColor: disabled ? "#94a3b8" : "#0f766e",
        paddingVertical: 10,
        paddingHorizontal: 14
      }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function ModeButton({
  label,
  active,
  onPress,
  disabled
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#0ea5e9" : "#cbd5e1",
        backgroundColor: active ? "#e0f2fe" : "#ffffff",
        paddingVertical: 7,
        paddingHorizontal: 12
      }}
    >
      <Text style={{ color: "#0f172a", fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function MobileAuthScreen({ auth }: Props) {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedEmail = useMemo(() => email.trim(), [email]);
  const isBusy = auth.loading || auth.isInitializing;
  const passwordMismatch =
    mode === "sign_up" &&
    confirmPassword.trim().length > 0 &&
    password !== confirmPassword;

  const canSignIn = normalizedEmail.length > 0 && password.length > 0;
  const canSignUp = canSignIn && confirmPassword.length > 0 && !passwordMismatch;
  const canReset = normalizedEmail.length > 0;

  const resetFeedback = () => {
    setNotice("");
    auth.clearError();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const handleSignIn = async () => {
    if (!canSignIn || isBusy) return;
    resetFeedback();
    const result = await auth.signIn(normalizedEmail, password);
    if (result.success) {
      setNotice("Signed in.");
    }
  };

  const handleSignUp = async () => {
    if (!canSignUp || isBusy) return;
    resetFeedback();
    const result = await auth.signUp(normalizedEmail, password);
    if (result.success) {
      setNotice("Account created. Check your email for verification.");
      setMode("sign_in");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleReset = async () => {
    if (!canReset || isBusy) return;
    resetFeedback();
    const result = await auth.requestPasswordReset(normalizedEmail);
    if (result.success) {
      setNotice("Password reset email requested.");
      setMode("sign_in");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#f6f7fb",
        justifyContent: "center",
        paddingHorizontal: 20
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 16,
          backgroundColor: "#ffffff",
          padding: 16,
          gap: 12
        }}
      >
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>
            Sign in to Yurbrain
          </Text>
          <Text style={{ color: "#475569" }}>
            Use your Nhost account to continue on mobile.
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ModeButton
            label="Sign in"
            active={mode === "sign_in"}
            onPress={() => switchMode("sign_in")}
            disabled={isBusy}
          />
          <ModeButton
            label="Sign up"
            active={mode === "sign_up"}
            onPress={() => switchMode("sign_up")}
            disabled={isBusy}
          />
          <ModeButton
            label="Reset password"
            active={mode === "reset_password"}
            onPress={() => switchMode("reset_password")}
            disabled={isBusy}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "700", color: "#0f172a" }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!isBusy}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#0f172a"
            }}
          />
        </View>

        {mode !== "reset_password" ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              editable={!isBusy}
              secureTextEntry
              placeholder="••••••••"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#0f172a"
              }}
            />
          </View>
        ) : null}

        {mode === "sign_up" ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Confirm password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isBusy}
              secureTextEntry
              placeholder="••••••••"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: "#0f172a"
              }}
            />
            {passwordMismatch ? (
              <Text style={{ color: "#b91c1c" }}>Passwords do not match.</Text>
            ) : null}
          </View>
        ) : null}

        {mode === "sign_in" ? (
          <ActionButton
            label={isBusy ? "Signing in..." : "Sign in"}
            onPress={() => {
              void handleSignIn();
            }}
            disabled={isBusy || !canSignIn}
          />
        ) : null}

        {mode === "sign_up" ? (
          <ActionButton
            label={isBusy ? "Creating account..." : "Create account"}
            onPress={() => {
              void handleSignUp();
            }}
            disabled={isBusy || !canSignUp}
          />
        ) : null}

        {mode === "reset_password" ? (
          <ActionButton
            label={isBusy ? "Requesting reset..." : "Send reset email"}
            onPress={() => {
              void handleReset();
            }}
            disabled={isBusy || !canReset}
          />
        ) : null}

        {notice || auth.error ? (
          <View style={{ width: "100%", gap: 6, paddingBottom: 2 }}>
            {notice ? (
              <Text style={{ color: "#0f766e", lineHeight: 22, flexShrink: 1, paddingBottom: 2 }}>
                {notice}
              </Text>
            ) : null}
            {auth.error ? (
              <Text style={{ color: "#991b1b", lineHeight: 22, flexShrink: 1, paddingBottom: 2 }}>
                {auth.error}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
