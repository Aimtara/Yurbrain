import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { dismissFeedCard, getFeed, refreshFeedCard, snoozeFeedCard } from "@yurbrain/client";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
type FeedCardDto = {
  id: string;
  cardType?: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  title: string;
  body?: string;
  itemId?: string | null;
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
  const [cardActionBusyId, setCardActionBusyId] = useState("");
  const [focusActionNotice, setFocusActionNotice] = useState("");
  const [feedFailed, setFeedFailed] = useState(false);
  const userId = "11111111-1111-1111-1111-111111111111";

  async function loadFocusPreview(lens: FeedLens) {
    setFocusLoading(true);
    try {
      const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: 3 });
      setFocusCards(cards);
      setFeedFailed(false);
      setFocusActionNotice("");
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#1d2130", marginBottom: 4 }}>Yurbrain</Text>
        <Text style={{ color: "#4d5468", marginBottom: 12 }}>Focus is home for resurfacing and gentle momentum.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>{tabButtons}</View>
        <Text style={{ marginBottom: 10, color: "#4d5468" }}>Active tab: {activeTab}</Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#1d2130", marginBottom: 6 }}>Focus Feed</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {focusLenses.map((lens) => (
            <TouchableOpacity
              key={lens}
              onPress={() => setActiveLens(lens)}
              accessibilityRole="button"
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#d8dce8",
                backgroundColor: activeLens === lens ? "#eef2ff" : "#ffffff"
              }}
            >
              <Text style={{ fontWeight: activeLens === lens ? "700" : "500", color: "#2d3448" }}>{lensLabels[lens]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: "#5a6072", marginBottom: 8 }}>{lensHints[activeLens]}</Text>
        {focusLoading ? <Text style={{ color: "#4d5468", marginBottom: 8 }}>Gathering memories worth resurfacing...</Text> : null}
        {!focusLoading && !feedFailed && focusCards.length === 0 ? (
          <Text style={{ color: "#4d5468", marginBottom: 8 }}>This lens is quiet right now. Capture and Focus will bring more back.</Text>
        ) : null}
        {!feedFailed ? (
          <View style={{ marginBottom: 8 }}>
            {focusCards.map((card) => (
              <MobileFeedCard
                key={card.id}
                card={card}
                isBusy={cardActionBusyId === card.id}
                onAction={(action) => {
                  void runCardAction(card, action);
                }}
              />
            ))}
          </View>
        ) : null}
        {feedFailed ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: "#4d5468", marginBottom: 6 }}>Focus is taking a breath. Your captures are safe.</Text>
            <TouchableOpacity
              onPress={() => loadFocusPreview(activeLens)}
              accessibilityRole="button"
              style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d8dce8", backgroundColor: "#ffffff" }}
            >
              <Text style={{ color: "#2d3448", fontWeight: "600" }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!feedFailed && focusActionNotice ? <Text style={{ color: "#374151", marginBottom: 8 }}>{focusActionNotice}</Text> : null}
        <Text style={{ color: "#6b7280", marginBottom: 8 }}>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" />
      </ScrollView>
    </SafeAreaView>
  );

  async function runCardAction(
    card: FeedCardDto,
    action: "dismiss" | "revisit_later" | "keep_in_focus" | "continue"
  ) {
    if (cardActionBusyId) return;
    setCardActionBusyId(card.id);
    setFocusActionNotice("");
    try {
      if (action === "dismiss") {
        await dismissFeedCard<{ ok: boolean }>(card.id);
        setFocusActionNotice("Dismissed. Focus will keep this out of your way.");
      } else if (action === "revisit_later") {
        await snoozeFeedCard<{ ok: boolean }>(card.id, 120);
        setFocusActionNotice("Revisit later set for 2 hours.");
      } else if (action === "keep_in_focus") {
        await refreshFeedCard<{ ok: boolean }>(card.id);
        setFocusActionNotice("Kept in focus.");
      } else {
        setActiveTab("Brain");
        setFocusActionNotice("Switched to Brain so you can continue from source context.");
      }
      await loadFocusPreview(activeLens);
    } catch {
      setFocusActionNotice("Could not complete that action right now.");
    } finally {
      setCardActionBusyId("");
    }
  }
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

const lensHints: Record<FeedLens, string> = {
  all: "A balanced mix of memories worth resurfacing now.",
  keep_in_mind: "Gentle reminders to keep nearby while thinking.",
  open_loops: "Unfinished threads that may need closure.",
  learning: "Ideas and notes with reusable takeaways.",
  in_progress: "Things already in motion so momentum stays intact.",
  recently_commented: "Memories you recently discussed or updated."
};

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

function MobileFeedCard({
  card,
  isBusy,
  onAction
}: {
  card: FeedCardDto;
  isBusy: boolean;
  onAction: (action: "dismiss" | "revisit_later" | "keep_in_focus" | "continue") => void;
}) {
  return (
    <View
      style={{
        marginBottom: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 12,
        backgroundColor: "#ffffff"
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 4 }}>{card.title}</Text>
      <Text numberOfLines={2} style={{ color: "#374151", marginBottom: 6 }}>
        {card.body ?? "Memory resurfaced for review."}
      </Text>
      <Text style={{ color: "#556079", marginBottom: 4 }}>
        {card.cardType ? cardTypeLabels[card.cardType] : "Memory"} · {card.lens ? lensLabels[card.lens] : lensLabels.all}
      </Text>
      <Text style={{ color: "#374151", marginBottom: 4 }}>Why shown: {card.whyShown?.summary ?? "Resurfaced to support continuity."}</Text>
      <Text style={{ color: "#6b7280", marginBottom: 8 }}>{formatMobileTimeSignal(card.lastRefreshedAt ?? null, card.createdAt)}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TouchableOpacity
          onPress={() => onAction("continue")}
          accessibilityRole="button"
          disabled={isBusy}
          style={mobileActionStyle}
        >
          <Text style={mobileActionTextStyle}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAction("keep_in_focus")}
          accessibilityRole="button"
          disabled={isBusy}
          style={mobileActionStyle}
        >
          <Text style={mobileActionTextStyle}>Keep in focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAction("revisit_later")}
          accessibilityRole="button"
          disabled={isBusy}
          style={mobileActionStyle}
        >
          <Text style={mobileActionTextStyle}>Revisit later</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAction("dismiss")}
          accessibilityRole="button"
          disabled={isBusy}
          style={mobileActionStyle}
        >
          <Text style={mobileActionTextStyle}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mobileActionStyle = {
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#d8dce8",
  backgroundColor: "#ffffff"
} as const;

const mobileActionTextStyle = {
  color: "#2d3448",
  fontWeight: "600"
} as const;
