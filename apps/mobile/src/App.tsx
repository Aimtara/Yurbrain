import { SafeAreaView, StatusBar, View } from "react-native";
import { configureApiBaseUrl } from "@yurbrain/client";

import { AppCaptureSheet } from "./features/capture/AppCaptureSheet";
import { FocusFeedSurface } from "./features/feed/FocusFeedSurface";
import { ItemDetailSurface } from "./features/item/ItemDetailSurface";
import { MeSurface } from "./features/me/MeSurface";
import { SessionSurface } from "./features/session/SessionSurface";
import { TimeSurface } from "./features/session/TimeSurface";
import { MobileTabBar } from "./features/shell/MobileTabBar";
import { useMobileLoopController } from "./features/shell/useMobileLoopController";

if (typeof window !== "undefined") {
  configureApiBaseUrl(`${window.location.protocol}//${window.location.hostname}:3001`);
}

export default function App() {
  const controller = useMobileLoopController();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {controller.activeSurface === "feed" ? <FocusFeedSurface controller={controller} /> : null}
        {controller.activeSurface === "item" ? <ItemDetailSurface controller={controller} /> : null}
        {controller.activeSurface === "session" ? <SessionSurface controller={controller} /> : null}
        {controller.activeSurface === "time" ? <TimeSurface controller={controller} /> : null}
        {controller.activeSurface === "me" ? <MeSurface controller={controller} /> : null}
      </View>
      <MobileTabBar activeSurface={controller.activeSurface} onNavigate={controller.navigateToPrimarySurface} />
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
