import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getFeed } from "@yurbrain/client";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
type FeedCardDto = {
  id: string;
  title: string;
  lens?: FeedLens;
  whyShown?: { summary?: string };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");
  const [focusPreview, setFocusPreview] = useState({
    title: "Loading feed...",
    whyShown: "",
    lens: "All focus"
  });
  const [feedFailed, setFeedFailed] = useState(false);

  async function loadFocusPreview() {
    try {
      const cards = await getFeed<FeedCardDto[]>();
      const first = cards[0];
      if (!first) {
        setFocusPreview({
          title: "No cards yet",
          whyShown: "Capture something and Focus will begin resurfacing it.",
          lens: "All focus"
        });
      } else {
        setFocusPreview({
          title: first.title,
          whyShown: first.whyShown?.summary ?? "Resurfaced to keep your memory continuity.",
          lens: first.lens ? lensLabels[first.lens] : "All focus"
        });
      }
      setFeedFailed(false);
    } catch {
      setFocusPreview({
        title: "No cards yet",
        whyShown: "Focus is unavailable right now; your captures are still safe.",
        lens: "All focus"
      });
      setFeedFailed(true);
      setActiveTab("Brain");
    }
  }

  useEffect(() => {
    loadFocusPreview();
  }, []);

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
        <Text>Focus preview: {focusPreview.title}</Text>
        <Text>Why shown: {focusPreview.whyShown}</Text>
        <Text>Lens: {focusPreview.lens}</Text>
        {feedFailed ? (
          <View>
            <Text>Focus is taking a breath. You can keep capturing while it catches up.</Text>
            <TouchableOpacity onPress={loadFocusPreview} accessibilityRole="button">
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
