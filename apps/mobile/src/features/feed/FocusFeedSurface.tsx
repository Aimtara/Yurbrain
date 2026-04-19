import { Pressable, ScrollView, Text, View } from "react-native";

import type { MobileLoopController } from "../shell/types";

const lensLabels: Record<MobileLoopController["activeLens"], string> = {
  all: "All",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recent"
};

const feedLenses: MobileLoopController["activeLens"][] = ["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"];
const executionLenses: MobileLoopController["executionLens"][] = ["all", "ready_to_move", "needs_unblock", "momentum"];
const executionLensLabels: Record<MobileLoopController["executionLens"], string> = {
  all: "All",
  ready_to_move: "Ready",
  needs_unblock: "Needs unblock",
  momentum: "Momentum"
};

export function FocusFeedSurface({ controller }: { controller: MobileLoopController }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#1d2130" }}>Focus Feed</Text>
        <Text style={{ color: "#4d5468" }}>Feed is home. Open a card, continue lightly, then return.</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, padding: 10, backgroundColor: "#ffffff", gap: 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable onPress={controller.openCaptureSheet} accessibilityRole="button" style={primaryButtonStyle}>
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Capture</Text>
          </Pressable>
          <Pressable
            onPress={() => controller.toggleFounderMode(!controller.founderMode)}
            accessibilityRole="button"
            accessibilityState={{ selected: controller.founderMode }}
            style={{ ...secondaryButtonStyle, backgroundColor: controller.founderMode ? "#eef2ff" : "#ffffff" }}
          >
            <Text style={{ color: "#2d3448", fontWeight: "600" }}>{controller.founderMode ? "Founder mode on" : "Founder mode off"}</Text>
          </Pressable>
        </View>
        <Text style={{ color: "#4d5468" }}>
          {controller.founderMode ? `Founder summary: ${controller.founderSummary.summary}` : "Resurfaced thoughts with gentle next moves."}
        </Text>
        {controller.founderMode ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {controller.founderStats.map((stat) => (
              <View key={stat.label} style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}>
                <Text style={{ color: "#475569", fontSize: 12 }}>
                  {stat.label}: <Text style={{ color: "#1f2937", fontWeight: "700" }}>{stat.value}</Text>
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {feedLenses.map((lens) => (
          <Pressable
            key={lens}
            onPress={() => controller.updateLens(lens)}
            accessibilityRole="button"
            accessibilityState={{ selected: controller.activeLens === lens }}
            style={{
              borderWidth: 1,
              borderColor: "#d8dce8",
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 10,
              backgroundColor: controller.activeLens === lens ? "#eef2ff" : "#ffffff"
            }}
          >
            <Text style={{ color: "#2d3448", fontWeight: controller.activeLens === lens ? "700" : "500" }}>{lensLabels[lens]}</Text>
          </Pressable>
        ))}
      </View>
      {controller.founderMode ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {executionLenses.map((lens) => (
            <Pressable
              key={lens}
              onPress={() => controller.setExecutionLens(lens)}
              accessibilityRole="button"
              accessibilityState={{ selected: controller.executionLens === lens }}
              style={{
                borderWidth: 1,
                borderColor: "#d8dce8",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: controller.executionLens === lens ? "#e0e7ff" : "#ffffff"
              }}
            >
              <Text style={{ color: "#2d3448", fontWeight: controller.executionLens === lens ? "700" : "500" }}>{executionLensLabels[lens]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {controller.founderMode && controller.founderSummary.suggested ? (
        <View style={{ borderWidth: 1, borderColor: "#dbeafe", borderRadius: 12, backgroundColor: "#eff6ff", padding: 12, gap: 6 }}>
          <Text style={{ color: "#1e3a8a", fontWeight: "700" }}>Founder suggested focus</Text>
          <Text style={{ color: "#1f2937", fontWeight: "700" }}>{controller.founderSummary.suggested.card.title}</Text>
          <Text style={{ color: "#334155" }}>{controller.founderSummary.suggested.continuity.nextStep ?? "Open and continue with one update."}</Text>
          <Pressable onPress={() => controller.openItemFromFeed(controller.founderSummary.suggested?.card ?? controller.feedCards[0].card)} style={secondaryButtonStyle}>
            <Text style={{ color: "#1e3a8a", fontWeight: "700" }}>Open suggested item</Text>
          </Pressable>
        </View>
      ) : null}
      {controller.founderMode && controller.founderSummary.blocked.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: "#fde68a", borderRadius: 12, backgroundColor: "#fffbeb", padding: 12, gap: 8 }}>
          <Text style={{ color: "#92400e", fontWeight: "700" }}>Needs unblock</Text>
          {controller.founderSummary.blocked.map((blocked) => (
            <Pressable key={blocked.card.id} onPress={() => controller.openItemFromFeed(blocked.card)} style={{ gap: 2 }}>
              <Text style={{ color: "#1f2937", fontWeight: "700" }}>{blocked.card.title}</Text>
              <Text style={{ color: "#475569" }}>{blocked.continuity.blockedState ?? blocked.continuity.nextStep ?? "Open and unblock with one note."}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {controller.feedLoading ? <Text style={{ color: "#4d5468" }}>Gathering continuity signals...</Text> : null}
      {controller.feedError ? (
        <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
          <Text style={{ color: "#4d5468" }}>{controller.feedError}</Text>
          <Pressable onPress={() => void controller.retryFeed()} style={secondaryButtonStyle}>
            <Text style={{ color: "#2d3448", fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!controller.feedLoading && !controller.feedError && controller.feedCards.length === 0 ? (
        <Text style={{ color: "#4d5468" }}>This lens is quiet right now. Capture a thought and return later.</Text>
      ) : null}

      {!controller.feedLoading && !controller.feedError ? (
        <View style={{ gap: 10 }}>
          {controller.feedCards.map((model) => (
            <View key={model.card.id} style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1f2937" }}>{model.card.title}</Text>
              <Text style={{ color: "#374151" }}>{model.card.body}</Text>
              <Text style={{ color: "#4d5468" }}>Why now: {model.continuity.whyShown ?? model.card.whyShown.summary}</Text>
              <Text style={{ color: "#4d5468" }}>Where left off: {model.continuity.whereLeftOff ?? "No previous note."}</Text>
              <Text style={{ color: "#4d5468" }}>Next move: {model.continuity.nextStep ?? "Open and leave one update."}</Text>
              <Text style={{ color: "#6b7280" }}>Last touch: {model.continuity.lastTouched ?? "recently"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <ActionButton label="Continue" onPress={() => controller.openItemFromFeed(model.card)} />
                {model.card.taskId ? <ActionButton label="Session" onPress={() => controller.openTask(model.card.taskId ?? "")} /> : null}
                <ActionButton label="Keep Nearby" onPress={() => void controller.runFeedAction(model.card, "keep_in_focus")} />
                <ActionButton label="Later" onPress={() => void controller.runFeedAction(model.card, "revisit_later")} />
                <ActionButton label="Dismiss" onPress={() => void controller.runFeedAction(model.card, "dismiss")} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {controller.surfaceNotice ? <Text style={{ color: "#374151" }}>{controller.surfaceNotice}</Text> : null}
      {controller.taskError ? <Text style={{ color: "#7f1d1d" }}>{controller.taskError}</Text> : null}
    </ScrollView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={secondaryButtonStyle}>
      <Text style={{ color: "#2d3448", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const primaryButtonStyle = {
  borderWidth: 1,
  borderColor: "#0f172a",
  borderRadius: 8,
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: "#0f172a"
} as const;

const secondaryButtonStyle = {
  borderWidth: 1,
  borderColor: "#d8dce8",
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
  backgroundColor: "#ffffff"
} as const;
