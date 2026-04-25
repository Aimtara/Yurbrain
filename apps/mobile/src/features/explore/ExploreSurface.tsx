import { Pressable, ScrollView, Text, View } from "react-native";

import type { ConnectionMode } from "../shared/types";
import type { MobileLoopController } from "../shell/types";

const modeLabels: Record<ConnectionMode, string> = {
  pattern: "Pattern",
  idea: "Idea",
  plan: "Plan",
  question: "Question"
};

const modeDescriptions: Record<ConnectionMode, string> = {
  pattern: "What do these have in common?",
  idea: "What could this become?",
  plan: "What should I do with this?",
  question: "What should I think about next?"
};

export function ExploreSurface({ controller }: { controller: MobileLoopController }) {
  const selectedCandidate = controller.exploreCandidates[controller.exploreSelectedCandidateIndex] ?? null;

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>Explore</Text>
        <Text style={{ color: "#475569", lineHeight: 20 }}>
          Add 2–5 cards. Yurbrain will help you find what connects them.
        </Text>
      </View>

      <Pressable
        onPress={() => controller.navigateToPrimarySurface("feed")}
        accessibilityRole="button"
        style={secondaryButtonStyle}
      >
        <Text style={secondaryButtonText}>Back to Focus Feed</Text>
      </Pressable>

      <View style={panelStyle}>
        <Text style={sectionTitleStyle}>Selected cards ({controller.exploreSourceIds.length}/5)</Text>
        {controller.exploreSelectedItems.length === 0 ? (
          <Text style={{ color: "#475569" }}>Start from a Feed card or tap a recent card below.</Text>
        ) : null}
        {controller.exploreSelectedItems.map((item) => (
          <View key={item.id} style={selectedCardStyle}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: "#0f172a", fontWeight: "700" }}>{item.title}</Text>
              <Text numberOfLines={2} style={{ color: "#475569" }}>{item.rawContent}</Text>
            </View>
            <Pressable onPress={() => controller.removeExploreSource(item.id)} style={tinyButtonStyle}>
              <Text style={tinyButtonText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={panelStyle}>
        <Text style={sectionTitleStyle}>Add cards</Text>
        <View style={{ gap: 8 }}>
          {controller.exploreAvailableItems.map((item) => {
            const selected = controller.exploreSourceIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => controller.toggleExploreSource(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? "#93c5fd" : "#d8dce8",
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: selected ? "#eff6ff" : "#ffffff",
                  gap: 4
                }}
              >
                <Text style={{ color: "#0f172a", fontWeight: "700" }}>{item.title}</Text>
                <Text numberOfLines={2} style={{ color: "#475569" }}>{item.rawContent}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={panelStyle}>
        <Text style={sectionTitleStyle}>Connection mode</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(modeLabels) as ConnectionMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => controller.setExploreMode(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: controller.exploreMode === mode }}
              style={{
                borderWidth: 1,
                borderColor: controller.exploreMode === mode ? "#93c5fd" : "#d8dce8",
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: controller.exploreMode === mode ? "#eff6ff" : "#ffffff"
              }}
            >
              <Text style={{ color: "#1e3a8a", fontWeight: "700" }}>{modeLabels[mode]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: "#475569" }}>{modeDescriptions[controller.exploreMode]}</Text>
        <Pressable
          onPress={() => void controller.previewExploreConnection()}
          disabled={controller.exploreLoading || controller.exploreSourceIds.length < 2}
          accessibilityRole="button"
          style={{
            ...primaryButtonStyle,
            opacity: controller.exploreLoading || controller.exploreSourceIds.length < 2 ? 0.6 : 1
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "800" }}>
            {controller.exploreLoading ? "Looking for the thread…" : "Make connection"}
          </Text>
        </Pressable>
      </View>

      {selectedCandidate ? (
        <View style={{ ...panelStyle, borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}>
          <Text style={{ color: "#1d4ed8", fontWeight: "800" }}>Yurbrain noticed a possible connection</Text>
          <Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "800" }}>{selectedCandidate.title}</Text>
          <Text style={{ color: "#334155", lineHeight: 20 }}>{selectedCandidate.summary}</Text>
          <Text style={sectionTitleStyle}>Why these connect</Text>
          {selectedCandidate.whyTheseConnect.map((reason) => (
            <Text key={reason} style={{ color: "#1e3a8a" }}>• {reason}</Text>
          ))}
          <Text style={sectionTitleStyle}>Next moves</Text>
          {selectedCandidate.suggestedNextActions.map((action) => (
            <Text key={action} style={{ color: "#334155" }}>• {action}</Text>
          ))}
          <Text style={{ color: "#64748b" }}>Confidence {Math.round(selectedCandidate.confidence * 100)}%</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => void controller.saveExploreConnection()}
              disabled={controller.exploreSaving}
              style={primaryButtonStyle}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>
                {controller.exploreSaving ? "Saving…" : "Save Connection"}
              </Text>
            </Pressable>
            <Pressable onPress={() => void controller.previewExploreConnection()} style={secondaryButtonStyle}>
              <Text style={secondaryButtonText}>Try another angle</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {controller.exploreNotice ? <Text style={{ color: "#1e3a8a" }}>{controller.exploreNotice}</Text> : null}
      {controller.exploreError ? <Text style={{ color: "#991b1b" }}>{controller.exploreError}</Text> : null}
    </ScrollView>
  );
}

const panelStyle = {
  borderWidth: 1,
  borderColor: "#d8dce8",
  borderRadius: 14,
  backgroundColor: "#ffffff",
  padding: 12,
  gap: 10
} as const;

const sectionTitleStyle = {
  color: "#0f172a",
  fontWeight: "800"
} as const;

const selectedCardStyle = {
  borderWidth: 1,
  borderColor: "#dbeafe",
  borderRadius: 12,
  backgroundColor: "#f8fbff",
  padding: 10,
  gap: 8,
  flexDirection: "row",
  alignItems: "center"
} as const;

const primaryButtonStyle = {
  alignSelf: "flex-start",
  borderRadius: 999,
  backgroundColor: "#1d4ed8",
  paddingVertical: 9,
  paddingHorizontal: 14
} as const;

const secondaryButtonStyle = {
  alignSelf: "flex-start",
  borderWidth: 1,
  borderColor: "#d8dce8",
  borderRadius: 999,
  backgroundColor: "#ffffff",
  paddingVertical: 8,
  paddingHorizontal: 12
} as const;

const secondaryButtonText = {
  color: "#2d3448",
  fontWeight: "700"
} as const;

const tinyButtonStyle = {
  borderWidth: 1,
  borderColor: "#d8dce8",
  borderRadius: 999,
  backgroundColor: "#ffffff",
  paddingVertical: 5,
  paddingHorizontal: 9
} as const;

const tinyButtonText = {
  color: "#475569",
  fontWeight: "700"
} as const;
