import { useState } from "react";
import { Pressable, SafeAreaView, StatusBar, Text, View } from "react-native";
import { configureApiBaseUrl } from "@yurbrain/client";

import { MobileAuthScreen } from "./features/auth/MobileAuthScreen";
import { AppCaptureSheet } from "./features/capture/AppCaptureSheet";
import { FocusFeedSurface } from "./features/feed/FocusFeedSurface";
import { ItemDetailSurface } from "./features/item/ItemDetailSurface";
import { MeSurface } from "./features/me/MeSurface";
import { SessionSurface } from "./features/session/SessionSurface";
import { TimeSurface } from "./features/session/TimeSurface";
import { MobileTabBar } from "./features/shell/MobileTabBar";
import { useMobileLoopController } from "./features/shell/useMobileLoopController";
import { useNhostAuth } from "./nhost/useNhostAuth";
import { YurbrainClientProvider } from "./providers/YurbrainClientProvider";

function resolveMobileApiBaseUrl(): string | null {
  const configuredApiBaseUrl =
    process.env.EXPO_PUBLIC_YURBRAIN_API_URL?.trim() ??
    process.env.NEXT_PUBLIC_YURBRAIN_API_URL?.trim();

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return null;
}

const mobileApiBaseUrl = resolveMobileApiBaseUrl();

if (mobileApiBaseUrl) {
  configureApiBaseUrl(mobileApiBaseUrl);
}

function MobileAuthedApp() {
  const auth = useNhostAuth();
  const isAuthLoading = auth.loading || auth.isInitializing;
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const sessionEmail = auth.session?.user?.email;
  const isEmailVerified = auth.isEmailVerified;

  return (
    <>
      {isAuthLoading ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <StatusBar barStyle="dark-content" />
          <Text style={{ color: "#334155", textAlign: "center" }}>
            Restoring Nhost session...
          </Text>
        </SafeAreaView>
      ) : null}
      {!isAuthLoading && !auth.isAuthenticated ? (
        <MobileAuthScreen auth={auth} />
      ) : null}
      {!isAuthLoading && auth.isAuthenticated ? (
        <MobileAuthenticatedShell
          sessionEmail={sessionEmail}
          isEmailVerified={isEmailVerified}
          authBusy={authBusy}
          authNotice={authNotice}
          authError={auth.error}
          onSignOut={async () => {
            setAuthBusy(true);
            setAuthNotice("");
            auth.clearError();
            const result = await auth.signOut();
            if (!result.success) {
              setAuthNotice("Could not sign out. Try again.");
            }
            setAuthBusy(false);
          }}
          onResendVerification={async () => {
            setAuthBusy(true);
            setAuthNotice("");
            auth.clearError();
            const result = await auth.sendVerificationEmail(sessionEmail);
            if (result.success) {
              setAuthNotice("Verification email sent.");
            }
            setAuthBusy(false);
          }}
        />
      ) : null}
    </>
  );
}

function MobileAuthenticatedShell({
  sessionEmail,
  isEmailVerified,
  authBusy,
  authNotice,
  authError,
  onSignOut,
  onResendVerification
}: {
  sessionEmail?: string;
  isEmailVerified: boolean;
  authBusy: boolean;
  authNotice: string;
  authError: string | null;
  onSignOut: () => Promise<void>;
  onResendVerification: () => Promise<void>;
}) {
  const controller = useMobileLoopController();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <StatusBar barStyle="dark-content" />
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          backgroundColor: "#ffffff",
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <Text style={{ color: "#334155", flex: 1 }}>
            {sessionEmail ? `Signed in as ${sessionEmail}` : "Signed in"}
          </Text>
          <Pressable
            onPress={() => {
              void onSignOut();
            }}
            disabled={authBusy}
            style={{
              borderRadius: 10,
              backgroundColor: "#0f766e",
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>
              {authBusy ? "Signing out..." : "Sign out"}
            </Text>
          </Pressable>
        </View>
        {!isEmailVerified ? (
          <View
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#fde68a",
              backgroundColor: "#fffbeb",
              padding: 10,
              gap: 8
            }}
          >
            <Text style={{ color: "#78350f", fontWeight: "700" }}>
              Email verification pending
            </Text>
            <Text style={{ color: "#92400e" }}>
              Verify your inbox to complete account verification.
            </Text>
            <Pressable
              onPress={() => {
                void onResendVerification();
              }}
              disabled={authBusy}
              style={{
                borderRadius: 10,
                backgroundColor: "#f59e0b",
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "700", textAlign: "center" }}>
                {authBusy ? "Sending..." : "Resend verification email"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {authNotice ? (
          <Text style={{ color: "#0f766e", flexShrink: 1, lineHeight: 20, paddingBottom: 2 }}>
            {authNotice}
          </Text>
        ) : null}
        {authError ? (
          <Text style={{ color: "#991b1b", flexShrink: 1, lineHeight: 20, paddingBottom: 2 }}>
            {authError}
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        {controller.activeSurface === "feed" ? <FocusFeedSurface controller={controller} /> : null}
        {controller.activeSurface === "item" ? <ItemDetailSurface controller={controller} /> : null}
        {controller.activeSurface === "session" ? <SessionSurface controller={controller} /> : null}
        {controller.activeSurface === "time" ? <TimeSurface controller={controller} /> : null}
        {controller.activeSurface === "me" ? <MeSurface controller={controller} /> : null}
      </View>
      <MobileTabBar activeSurface={controller.activeSurface} onNavigate={controller.navigateToPrimarySurface} sessionTabEnabled={controller.sessionTabVisible} />
      <AppCaptureSheet
        open={controller.captureSheetOpen}
        draft={controller.captureDraft}
        loading={controller.captureLoading}
        errorMessage={controller.captureError}
        statusMessage={controller.captureStatusNotice}
        successMessage={controller.captureSuccessNotice}
        onClose={controller.closeCaptureSheet}
        onChangeDraft={controller.setCaptureDraft}
        onSubmit={controller.captureItem}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <YurbrainClientProvider>
      <MobileAuthedApp />
    </YurbrainClientProvider>
  );
}
