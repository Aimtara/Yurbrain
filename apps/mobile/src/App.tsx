import { SafeAreaView, StatusBar, View } from "react-native";
import { configureApiBaseUrl } from "@yurbrain/client";
import { NhostProvider, NhostClient } from "@nhost/react";

import { AppCaptureSheet } from "./features/capture/AppCaptureSheet";
import { FocusFeedSurface } from "./features/feed/FocusFeedSurface";
import { ItemDetailSurface } from "./features/item/ItemDetailSurface";
import { MeSurface } from "./features/me/MeSurface";
import { SessionSurface } from "./features/session/SessionSurface";
import { TimeSurface } from "./features/session/TimeSurface";
import { MobileTabBar } from "./features/shell/MobileTabBar";
import { useMobileLoopController } from "./features/shell/useMobileLoopController";
import { YurbrainClientProvider } from "./providers/YurbrainClientProvider";

if (typeof window !== "undefined") {
  configureApiBaseUrl(`${window.location.protocol}//${window.location.hostname}:3001`);
}

// Initialize the local client using your .env variables
const nhost = new NhostClient({
  authUrl: process.env.EXPO_PUBLIC_NHOST_AUTH_URL,
  graphqlUrl: process.env.EXPO_PUBLIC_NHOST_GRAPHQL_URL,
  functionsUrl: process.env.EXPO_PUBLIC_NHOST_FUNCTIONS_URL
});

export default function App() {
  const controller = useMobileLoopController();

  return (
    <NhostProvider nhost={nhost}>
      <YurbrainClientProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
          <StatusBar barStyle="dark-content" />
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
      </YurbrainClientProvider>
    </NhostProvider>
  );
}
