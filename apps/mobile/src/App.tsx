import { useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");
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
        <Text>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" />
      </View>
    </SafeAreaView>
  );
}
