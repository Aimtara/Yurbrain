import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getFeed } from "@yurbrain/client";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

type FeedCardDto = { id: string; title: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");
  const [focusPreview, setFocusPreview] = useState("Loading feed...");

  useEffect(() => {
    getFeed<FeedCardDto[]>()
      .then((cards) => setFocusPreview(cards[0]?.title ?? "No cards yet"))
      .catch(() => setFocusPreview("No cards yet"));
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
        <Text>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" />
      </View>
    </SafeAreaView>
  );
}
