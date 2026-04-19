import { Pressable, Text, View } from "react-native";

import type { MobileSurface } from "../shared/types";

type MobileTabBarProps = {
  activeSurface: MobileSurface;
  onNavigate: (surface: MobileSurface) => void;
};

const tabs: Array<{ surface: MobileSurface; label: string }> = [
  { surface: "feed", label: "Focus" },
  { surface: "time", label: "Time" },
  { surface: "session", label: "Session" },
  { surface: "me", label: "Me" }
];

export function MobileTabBar({ activeSurface, onNavigate }: MobileTabBarProps) {
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
        const selected = activeSurface === tab.surface;
        return (
          <Pressable
            key={tab.surface}
            onPress={() => onNavigate(tab.surface)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? "#b8c3ea" : "#d8dce8",
              backgroundColor: selected ? "#eef2ff" : "#ffffff",
              paddingVertical: 10,
              alignItems: "center"
            }}
          >
            <Text style={{ color: "#2d3448", fontWeight: selected ? "700" : "500" }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
