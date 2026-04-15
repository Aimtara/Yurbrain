import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import type { FeedCardModel, FeedLens } from "./types";

const LENSES: FeedLens[] = ["all", "execution", "open_loops", "keep_in_mind", "recent"];

function Card({ card, onOpen, onAction }: {
  card: FeedCardModel;
  onOpen?: (id: string) => void;
  onAction?: (id: string, action: FeedCardModel["actions"][number]) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>{card.type.replace("_", " ")}</Text>
        {card.executionStatus ? <Text style={styles.badge}>{card.executionStatus.replace("_", " ")}</Text> : null}
        {card.executionPriority ? <Text style={styles.badge}>{card.executionPriority} priority</Text> : null}
      </View>

      <Pressable onPress={() => onOpen?.(card.id)}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.preview}>{card.preview}</Text>
      </Pressable>

      <View style={styles.whyPanel}>
        <Text style={styles.whyLabel}>Why this surfaced</Text>
        <Text style={styles.whyText}>{card.whyShown}</Text>
      </View>

      <View style={styles.actionRow}>
        {card.actions.slice(0, 3).map((action) => (
          <Pressable key={action} style={styles.actionButton} onPress={() => onAction?.(card.id, action)}>
            <Text style={styles.actionText}>{action.replaceAll("_", " ")}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function FocusFeedScreen({
  cards,
  founderMode = false,
  onOpenCard,
  onAction,
}: {
  cards: FeedCardModel[];
  founderMode?: boolean;
  onOpenCard?: (id: string) => void;
  onAction?: (id: string, action: FeedCardModel["actions"][number]) => void;
}) {
  const [lens, setLens] = useState<FeedLens>(founderMode ? "execution" : "all");

  const filtered = useMemo(() => {
    if (lens === "all") return cards;
    if (lens === "execution") return cards.filter((c) => c.executionStatus && c.executionStatus !== "done");
    if (lens === "recent") return [...cards].sort((a, b) => (a.lastTouchedAt || "").localeCompare(b.lastTouchedAt || "")).reverse();
    return cards.filter((c) => c.type === lens.slice(0, -1) || c.type === lens);
  }, [cards, lens]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Yurbrain</Text>
            <Text style={styles.screenTitle}>Focus</Text>
          </View>
          <Pressable style={styles.modeButton}>
            <Text style={styles.modeButtonText}>{founderMode ? "Founder ⚡" : "Personal"}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lensRow}>
          {LENSES.map((entry) => (
            <Pressable
              key={entry}
              style={[styles.lensChip, entry === lens && styles.lensChipActive]}
              onPress={() => setLens(entry)}
            >
              <Text style={[styles.lensText, entry === lens && styles.lensTextActive]}>{entry.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.list}>
          {filtered.map((card) => (
            <Card key={card.id} card={card} onOpen={onOpenCard} onAction={onAction} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  screenTitle: { fontSize: 30, fontWeight: "800", color: "#020617" },
  modeButton: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  modeButtonText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  lensRow: { gap: 8, paddingVertical: 4 },
  lensChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" },
  lensChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  lensText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  lensTextActive: { color: "#FFFFFF" },
  list: { gap: 14 },
  card: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, gap: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { fontSize: 12, color: "#475569", backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  preview: { marginTop: 6, fontSize: 15, lineHeight: 22, color: "#475569" },
  whyPanel: { backgroundColor: "#F8FAFC", padding: 12, borderRadius: 16 },
  whyLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase" },
  whyText: { marginTop: 4, fontSize: 14, lineHeight: 20, color: "#334155" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { fontSize: 13, fontWeight: "600", color: "#334155" },
});
