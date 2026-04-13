import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getFeed } from "@yurbrain/client";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

type FeedCardDto = { id: string; title: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");
  const [focusPreview, setFocusPreview] = useState("Loading feed...");
  const [feedFailed, setFeedFailed] = useState(false);

  async function loadFocusPreview() {
    try {
      const cards = await getFeed<FeedCardDto[]>();
      setFocusPreview(cards[0]?.title ?? "No cards yet");
      setFeedFailed(false);
    } catch {
      setFocusPreview("No cards yet");
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
        <Text>Focus preview: {focusPreview}</Text>
        {feedFailed ? (
          <View>
            <Text>Feed unavailable. You are in Brain tab so capture still works.</Text>
            <TouchableOpacity onPress={loadFocusPreview} accessibilityRole="button">
              <Text>Retry feed</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <Text>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" />
      </View>
    </SafeAreaView>
  );
}
