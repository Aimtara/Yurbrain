import React from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { BrainItemDetailModel } from "./types";

export function ItemDetailScreen({
  item,
  founderMode = false,
  onAddUpdate,
  onPlanThis,
  onStartSession,
  onSummarizeProgress,
  onSuggestNext,
}: {
  item: BrainItemDetailModel;
  founderMode?: boolean;
  onAddUpdate?: () => void;
  onPlanThis?: () => void;
  onStartSession?: () => void;
  onSummarizeProgress?: () => void;
  onSuggestNext?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.back}>← Back</Text>

        <View style={styles.panel}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.rawContent}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Context</Text>
          <Text style={styles.helper}>{item.whyItMatters || "No why-it-matters note yet."}</Text>
          {item.lastTouchedAt ? <Text style={styles.meta}>Last touched {item.lastTouchedAt}</Text> : null}
        </View>

        {founderMode ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Execution</Text>
            <Text style={styles.meta}>Status: {item.executionStatus || "idea"}</Text>
            <Text style={styles.meta}>Priority: {item.executionPriority || "medium"}</Text>
            {item.blockedReason ? <Text style={styles.helper}>Blocked by: {item.blockedReason}</Text> : null}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.button} onPress={onAddUpdate}>
            <Text style={styles.buttonText}>{founderMode ? "Add Progress Update" : "Add Update"}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onPlanThis}>
            <Text style={styles.buttonText}>Plan This</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onStartSession}>
            <Text style={styles.buttonText}>Start Session</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.button} onPress={onSummarizeProgress}>
            <Text style={styles.buttonText}>Summarize Progress</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onSuggestNext}>
            <Text style={styles.buttonText}>What Should I Do Next?</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Thinking Timeline</Text>
          {item.thread.map((message) => (
            <View key={message.id} style={styles.timelineEntry}>
              <Text style={styles.meta}>{message.author} · {message.createdAt}</Text>
              <Text style={styles.helper}>{message.content}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Quick Update</Text>
          <TextInput
            multiline
            placeholder={founderMode ? "What changed? What’s blocking you? What should happen next?" : "Add a note..."}
            style={styles.input}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 16 },
  back: { fontSize: 14, fontWeight: "600", color: "#475569" },
  panel: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  body: { fontSize: 16, lineHeight: 24, color: "#334155" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  helper: { fontSize: 15, lineHeight: 22, color: "#475569" },
  meta: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: { borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 12 },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  timelineEntry: { borderRadius: 14, backgroundColor: "#F8FAFC", padding: 12, gap: 6 },
  input: { minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", padding: 12, textAlignVertical: "top" },
});
