import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { MobileLoopController } from "../shell/types";

type Props = {
  controller: MobileLoopController;
};

export function ItemDetailSurface({ controller }: Props) {
  const [composerMode, setComposerMode] = useState<"comment" | "ask">("comment");
  const [draft, setDraft] = useState("");
  const item = controller.selectedItem;
  const continuity = controller.itemContinuity;
  const canStartSession = item ? controller.tasks.some((task) => task.sourceItemId === item.id && task.status !== "done") : false;

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
      <Pressable
        onPress={() => controller.navigateToPrimarySurface("feed")}
        accessibilityRole="button"
        style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#d8dce8", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#ffffff" }}
      >
        <Text style={{ color: "#2d3448", fontWeight: "600" }}>Back to Focus Feed</Text>
      </Pressable>

      {!item ? (
        <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12 }}>
          <Text style={{ color: "#334155" }}>Pick a feed card to restore context.</Text>
        </View>
      ) : (
        <>
          <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>{item.title}</Text>
            <Text style={{ color: "#334155", lineHeight: 22 }}>{item.rawContent}</Text>
          </View>

          <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 12, backgroundColor: "#eff6ff", padding: 12, gap: 6 }}>
            <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Resume packet</Text>
            <Text style={{ color: "#1e3a8a" }}>
              <Text style={{ fontWeight: "700" }}>Why it matters:</Text> {continuity.whyShown ?? "Resurfaced to restore continuity."}
            </Text>
            <Text style={{ color: "#1e3a8a" }}>
              <Text style={{ fontWeight: "700" }}>Last touched:</Text> {continuity.lastTouched ?? "Recently"}
            </Text>
            <Text style={{ color: "#1e3a8a" }}>
              <Text style={{ fontWeight: "700" }}>Where you left off:</Text> {continuity.whereLeftOff ?? "No continuation note yet."}
            </Text>
            <Text style={{ color: "#1e3a8a" }}>
              <Text style={{ fontWeight: "700" }}>What changed:</Text> {continuity.changedSince ?? "No recent update."}
            </Text>
            {continuity.blockedState ? (
              <Text style={{ color: "#92400e" }}>
                <Text style={{ fontWeight: "700" }}>Blocked:</Text> {continuity.blockedState}
              </Text>
            ) : null}
            <Text style={{ color: "#1e3a8a" }}>
              <Text style={{ fontWeight: "700" }}>Next move:</Text> {continuity.nextStep ?? "Add one short update and return to feed."}
            </Text>
          </View>

          <View style={{ borderWidth: 1, borderColor: "#d1fae5", borderRadius: 12, backgroundColor: "#ecfdf5", padding: 12, gap: 8 }}>
            <Text style={{ color: "#065f46", fontWeight: "700" }}>Continue from here</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ActionChip label="Summarize Progress" onPress={() => void controller.runQuickAction("summarize_progress")} disabled={controller.aiBusy} />
              <ActionChip label="What Should I Do Next?" onPress={() => void controller.runQuickAction("next_step")} disabled={controller.aiBusy} />
              <ActionChip label="Plan This" onPress={() => void controller.runQuickAction("convert_to_task")} disabled={controller.aiBusy} />
              <ActionChip label="Explore with related" onPress={() => controller.openExploreFromItem()} />
              <ActionChip label={canStartSession ? "Start Session" : "Plan first"} onPress={() => void controller.startSessionFromItem()} disabled={!canStartSession} />
            </View>
            {controller.aiBusy ? <Text style={{ color: "#065f46" }}>Yurbrain is thinking…</Text> : null}
          </View>

          <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setComposerMode("comment")}
                style={{
                  borderWidth: 1,
                  borderColor: "#d8dce8",
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: composerMode === "comment" ? "#eef2ff" : "#ffffff"
                }}
              >
                <Text style={{ color: "#2d3448", fontWeight: "700" }}>Add Update</Text>
              </Pressable>
              <Pressable
                onPress={() => setComposerMode("ask")}
                style={{
                  borderWidth: 1,
                  borderColor: "#d8dce8",
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: composerMode === "ask" ? "#eef2ff" : "#ffffff"
                }}
              >
                <Text style={{ color: "#2d3448", fontWeight: "700" }}>Ask Yurbrain</Text>
              </Pressable>
            </View>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={composerMode === "ask" ? "Ask a concise question..." : "Add one continuation note..."}
              style={{ minHeight: 84, borderWidth: 1, borderColor: "#d8dce8", borderRadius: 10, backgroundColor: "#ffffff", paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: "top" }}
            />
            <Pressable
              onPress={() => {
                const normalized = draft.trim();
                if (!normalized) return;
                if (composerMode === "ask") {
                  void controller.askItemQuestion(normalized);
                } else {
                  void controller.updateItemComment(normalized);
                }
                setDraft("");
              }}
              disabled={controller.aiBusy && composerMode === "ask"}
              style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#d8dce8", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#ffffff" }}
            >
              <Text style={{ color: "#2d3448", fontWeight: "600", opacity: controller.aiBusy && composerMode === "ask" ? 0.6 : 1 }}>
                {composerMode === "ask" ? (controller.aiBusy ? "Thinking…" : "Ask Yurbrain") : "Send update"}
              </Text>
            </Pressable>
          </View>

          <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>Thinking timeline</Text>
            {controller.itemLoading ? <Text style={{ color: "#475569" }}>Loading continuity context...</Text> : null}
            {!controller.itemLoading && controller.timelineEntries.length === 0 ? <Text style={{ color: "#475569" }}>No entries yet. Add one sentence to preserve re-entry.</Text> : null}
            {controller.timelineEntries.map((entry) => (
              <View key={entry.id} style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, backgroundColor: "#f8fafc", padding: 10, gap: 4 }}>
                <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
                  {entry.role === "assistant" ? "Yurbrain" : entry.role === "system" ? "System" : "You"}
                  {entry.timestamp ? ` · ${entry.timestamp}` : ""}
                </Text>
                <Text style={{ color: "#0f172a" }}>{entry.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 12, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>Related continuity</Text>
            {controller.relatedItems.length === 0 ? <Text style={{ color: "#475569" }}>No related items yet.</Text> : null}
            {controller.relatedItems.map((related) => (
              <Pressable
                key={related.id}
                onPress={() => void controller.openRelatedItem(related.id)}
                style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 999, backgroundColor: "#ffffff", paddingVertical: 7, paddingHorizontal: 10 }}
              >
                <Text style={{ color: "#334155", fontWeight: "700" }}>{related.title}</Text>
                <Text style={{ color: "#64748b", marginTop: 2 }}>{related.hint}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {controller.aiError ? <Text style={{ color: "#991b1b" }}>{controller.aiError}</Text> : null}
      {controller.surfaceNotice ? <Text style={{ color: "#1e3a8a" }}>{controller.surfaceNotice}</Text> : null}
    </ScrollView>
  );
}

function ActionChip({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 999,
        backgroundColor: disabled ? "#f3f4f6" : "#ffffff",
        paddingVertical: 6,
        paddingHorizontal: 10
      }}
    >
      <Text style={{ color: "#2d3448", fontWeight: "700", opacity: disabled ? 0.65 : 1 }}>{label}</Text>
    </Pressable>
  );
}
