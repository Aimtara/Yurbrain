import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getFeed } from "@yurbrain/client";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
type FeedCardDto = {
  id: string;
  cardType?: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  title: string;
  body?: string;
  lens?: FeedLens;
  createdAt?: string;
  lastRefreshedAt?: string | null;
  whyShown?: { summary?: string; reasons?: string[] };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");
  const [activeLens, setActiveLens] = useState<FeedLens>("all");
  const [focusCards, setFocusCards] = useState<FeedCardDto[]>([]);
  const [focusLoading, setFocusLoading] = useState(false);
  const [feedFailed, setFeedFailed] = useState(false);
  const userId = "11111111-1111-1111-1111-111111111111";

  async function loadFocusPreview(lens: FeedLens) {
    setFocusLoading(true);
    try {
      const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: 3 });
      setFocusCards(cards);
      setFeedFailed(false);
    } catch {
      setFocusCards([]);
      setFeedFailed(true);
      setActiveTab("Brain");
    } finally {
      setFocusLoading(false);
    }
  }

  useEffect(() => {
    loadFocusPreview(activeLens);
  }, [activeLens]);

  const tabButtons = useMemo(
    () =>
      tabs.map((tab) => (
        <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="button">
          <Text>{tab}</Text>
        </TouchableOpacity>
      )),
    [activeTab]
  );

  return (
    <SafeAreaView>
      <View>
        <Text>Yurbrain</Text>
        <View>{tabButtons}</View>
        <Text>{activeTab}</Text>
        <Text>Focus preview</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {focusLenses.map((lens) => (
            <TouchableOpacity key={lens} onPress={() => setActiveLens(lens)} accessibilityRole="button">
              <Text>{activeLens === lens ? `[${lensLabels[lens]}]` : lensLabels[lens]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {focusLoading ? <Text>Gathering memories to resurface...</Text> : null}
        {!focusLoading && !feedFailed && focusCards.length === 0 ? <Text>No cards yet. Capture and Focus will start resurfacing.</Text> : null}
        {!feedFailed ? (
          <ScrollView style={{ maxHeight: 260 }}>
            {focusCards.map((card) => (
              <View key={card.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#ddd" }}>
                <Text>{card.title}</Text>
                <Text numberOfLines={2}>{card.body ?? "Memory resurfaced for review."}</Text>
                <Text>{card.cardType ? cardTypeLabels[card.cardType] : "Memory"} · {card.lens ? lensLabels[card.lens] : lensLabels.all}</Text>
                <Text>Why shown: {card.whyShown?.summary ?? "Resurfaced to support continuity."}</Text>
                <Text>{formatMobileTimeSignal(card.lastRefreshedAt ?? null, card.createdAt)}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
        {feedFailed ? (
          <View>
            <Text>Focus is taking a breath. You can keep capturing while it catches up.</Text>
            <TouchableOpacity onPress={() => loadFocusPreview(activeLens)} accessibilityRole="button">
              <Text>Retry Focus</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" />
      </View>
    </SafeAreaView>
  );
}

const lensLabels: Record<FeedLens, string> = {
  all: "All focus",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recent comments"
};

const focusLenses: FeedLens[] = ["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"];

const cardTypeLabels: Record<NonNullable<FeedCardDto["cardType"]>, string> = {
  item: "Memory",
  digest: "Digest",
  cluster: "Cluster",
  opportunity: "Opportunity",
  open_loop: "Open loop",
  resume: "Resume"
};

function formatMobileTimeSignal(lastRefreshedAt: string | null, createdAt?: string): string {
  if (lastRefreshedAt) return `Last touched ${formatRelativeTime(lastRefreshedAt)}`;
  if (createdAt) return `Saved ${formatRelativeTime(createdAt)}`;
  return "Saved recently";
}

function formatRelativeTime(timestamp: string): string {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return "recently";
  const diffHours = Math.max(0, (Date.now() - value) / 3_600_000);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const days = Math.floor(diffHours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
