import { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");

  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "600" }}>Yurbrain</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="button">
              <Text>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 18 }}>{activeTab}</Text>
        <Text>Clean/focus mode is enabled by default.</Text>
        <TextInput placeholder="CaptureComposer" style={{ borderWidth: 1, borderColor: "#ccc", padding: 12 }} />
      </View>
    </SafeAreaView>
  );
}
