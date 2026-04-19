import { Pressable, Text, View } from "react-native";

import type { MobileSurface } from "../shared/types";

type MobileTabBarProps = {
  activeSurface: MobileSurface;
  onNavigate: (surface: MobileSurface) => void;
  sessionTabEnabled: boolean;
};

const tabs: Array<{ surface: MobileSurface; label: string }> = [
  { surface: "feed", label: "Focus" },
  { surface: "time", label: "Time" },
  { surface: "session", label: "Session" },
  { surface: "me", label: "Me" }
];

export function MobileTabBar({ activeSurface, onNavigate, sessionTabEnabled }: MobileTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        borderTopWidth: 1,
        borderTopColor: "#d8dce8",
        backgroundColor: "#ffffff",
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8
      }}
    >
      {tabs.map((tab) => {
        const disabled = tab.surface === "session" && !sessionTabEnabled;
        const selected = activeSurface === tab.surface;
        return (
          <Pressable
            key={tab.surface}
            onPress={() => (disabled ? undefined : onNavigate(tab.surface))}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            style={{
              flex: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? "#b8c3ea" : "#d8dce8",
              backgroundColor: selected ? "#eef2ff" : disabled ? "#f8fafc" : "#ffffff",
              paddingVertical: 10,
              alignItems: "center",
              opacity: disabled ? 0.55 : 1
            }}
          >
            <Text style={{ color: "#2d3448", fontWeight: selected ? "700" : "500" }}>{disabled ? "Session*" : tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
