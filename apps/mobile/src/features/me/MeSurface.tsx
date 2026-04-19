import { ScrollView, Text, View } from "react-native";

import type { MobileLoopController } from "../shell/types";

export function MeSurface({ controller }: { controller: MobileLoopController }) {
  const meInsights = {
    topInsight: controller.meTopInsight,
    recommendation: controller.meRecommendation,
    estimationAccuracy: {
      label: "Execution rhythm",
      detail: `Done ${controller.founderStats[1]?.value ?? "0"} cards in focus; keep next steps scoped for mobile interruptions.`
    },
    carryForward: {
      label: "Carry-forward load",
      detail: `${controller.founderStats[0]?.value ?? "0"} active feed cards remain in motion.`
    },
    postponement: {
      label: "Unblock signal",
      detail: `${controller.founderStats[2]?.value ?? "0"} cards currently flagged as needing unblock attention.`
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#1d2130" }}>Me</Text>
        <Text style={{ color: "#4d5468" }}>Supportive reflection from your recent continuity flow.</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
        <Text style={{ fontWeight: "700", color: "#1f2937" }}>Top insight</Text>
        <Text style={{ color: "#334155" }}>{meInsights.topInsight}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
        <Text style={{ fontWeight: "700", color: "#1f2937" }}>Estimation accuracy</Text>
        <Text style={{ color: "#334155" }}>{meInsights.estimationAccuracy.label}</Text>
        <Text style={{ color: "#475569" }}>{meInsights.estimationAccuracy.detail}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
        <Text style={{ fontWeight: "700", color: "#1f2937" }}>Carry-forward pattern</Text>
        <Text style={{ color: "#334155" }}>{meInsights.carryForward.label}</Text>
        <Text style={{ color: "#475569" }}>{meInsights.carryForward.detail}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
        <Text style={{ fontWeight: "700", color: "#1f2937" }}>Postponement pattern</Text>
        <Text style={{ color: "#334155" }}>{meInsights.postponement.label}</Text>
        <Text style={{ color: "#475569" }}>{meInsights.postponement.detail}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: "#b7f0d7", borderRadius: 14, padding: 12, backgroundColor: "#ecfdf5", gap: 8 }}>
        <Text style={{ fontWeight: "700", color: "#065f46" }}>Recommendation</Text>
        <Text style={{ color: "#065f46" }}>{meInsights.recommendation}</Text>
      </View>
    </ScrollView>
  );
}
