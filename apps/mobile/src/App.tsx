import { SafeAreaView, StatusBar, Text, View } from "react-native";
import { configureApiBaseUrl } from "@yurbrain/client";

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

if (typeof window !== "undefined") {
  configureApiBaseUrl(`${window.location.protocol}//${window.location.hostname}:3001`);
}

function MobileAuthedApp() {
  const auth = useNhostAuth();
  const controller = useMobileLoopController();
  const isAuthLoading = auth.loading || auth.isInitializing;

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
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <StatusBar barStyle="dark-content" />
          <Text style={{ color: "#991b1b", textAlign: "center", fontWeight: "700" }}>
            Sign in required
          </Text>
          <Text style={{ color: "#475569", textAlign: "center", marginTop: 8 }}>
            This mobile surface requires an authenticated Nhost session.
          </Text>
          {auth.error ? (
            <Text style={{ color: "#991b1b", textAlign: "center", marginTop: 8 }}>
              {auth.error}
            </Text>
          ) : null}
        </SafeAreaView>
      ) : null}
      {!isAuthLoading && auth.isAuthenticated ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
          <StatusBar barStyle="dark-content" />
          {controller.bootstrapLoading ? (
            <View style={{ margin: 16, borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe", backgroundColor: "#eff6ff", padding: 14, gap: 4 }}>
              <Text style={{ color: "#1e3a8a", fontWeight: "700", fontSize: 18 }}>Loading your workspace</Text>
              <Text style={{ color: "#1e3a8a" }}>Verifying current-user identity before opening your mobile core loop.</Text>
            </View>
          ) : null}
          {!controller.bootstrapLoading && controller.bootstrapError ? (
            <View style={{ margin: 16, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: 14, gap: 4 }}>
              <Text style={{ color: "#7f1d1d", fontWeight: "700", fontSize: 18 }}>Sign in required</Text>
              <Text style={{ color: "#7f1d1d" }}>{controller.bootstrapError}</Text>
            </View>
          ) : null}
          {!controller.bootstrapLoading && !controller.bootstrapError ? (
            <>
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
            </>
          ) : null}
        </SafeAreaView>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <YurbrainClientProvider>
      <MobileAuthedApp />
    </YurbrainClientProvider>
  );
}
