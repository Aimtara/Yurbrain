import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { MobileLoopController } from "../shell/types";
import { timeWindowDurations, timeWindowLabels, timeWindowOptions } from "../shared/time";

type TimeSurfaceProps = {
  controller: MobileLoopController;
};

export function TimeSurface({ controller }: TimeSurfaceProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#d8dce8",
          borderRadius: 14,
          backgroundColor: "#ffffff",
          padding: 12,
          gap: 10
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#1d2130" }}>Time</Text>
        <Text style={{ color: "#4d5468" }}>Pick a window and start one lightweight step.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {timeWindowOptions.map((window) => (
            <Pressable
              key={window}
              onPress={() => controller.setTimeWindow(window)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#d8dce8",
                backgroundColor: controller.timeWindow === window ? "#eef2ff" : "#ffffff"
              }}
            >
              <Text style={{ color: "#2d3448", fontWeight: controller.timeWindow === window ? "700" : "500" }}>{timeWindowLabels[window]}</Text>
            </Pressable>
          ))}
        </View>
        {controller.timeWindow === "custom" ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: "#4d5468" }}>Custom minutes</Text>
            <TextInput
              keyboardType="numeric"
              value={controller.customWindowMinutes}
              onChangeText={controller.setCustomWindowMinutes}
              style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#ffffff" }}
            />
          </View>
        ) : null}
        <Text style={{ color: "#4d5468" }}>Current window: {controller.windowMinutes} minutes.</Text>
        {controller.activeSession && controller.activeSession.state !== "finished" && controller.selectedTask ? (
          <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 10, backgroundColor: "#eff6ff", padding: 10, gap: 6 }}>
            <Text style={{ color: "#1e3a8a", fontWeight: "700" }}>Resume in progress</Text>
            <Text style={{ color: "#334155" }}>{controller.selectedTask.title}</Text>
            <Text style={{ color: "#334155", fontSize: 12 }}>
              {controller.activeSession.state === "running" ? "Running now." : "Paused and ready."}
            </Text>
            <Pressable
              onPress={() => void controller.startTask(controller.selectedTask?.id ?? "")}
              style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d8dce8", backgroundColor: "#ffffff" }}
            >
              <Text style={{ color: "#2d3448", fontWeight: "600" }}>Resume task</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={{ color: "#1d2130", fontWeight: "700" }}>Suggested tasks</Text>
        {controller.suggestedTasksForWindow.length === 0 ? (
          <Text style={{ color: "#4d5468" }}>No tasks fit yet. Capture and plan one thought first.</Text>
        ) : (
          controller.suggestedTasksForWindow.map((entry) => (
            <View key={entry.task.id} style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 10, backgroundColor: "#ffffff", padding: 10, gap: 6 }}>
              <Text style={{ color: "#1d2130", fontWeight: "700" }}>{entry.task.title}</Text>
              <Text style={{ color: "#4d5468" }}>
                Est. {entry.minutes}m · {entry.task.status}
              </Text>
              <Pressable
                onPress={() => void controller.startTask(entry.task.id)}
                style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d8dce8", backgroundColor: "#ffffff" }}
              >
                <Text style={{ color: "#2d3448", fontWeight: "600" }}>Start</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          onPress={controller.startWithoutPlanning}
          style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#0f172a", backgroundColor: "#0f172a" }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>Start without planning</Text>
        </Pressable>
        {controller.timeNotice ? <Text style={{ color: "#374151" }}>{controller.timeNotice}</Text> : null}
        {controller.taskError ? <Text style={{ color: "#991b1b" }}>{controller.taskError}</Text> : null}
      </View>
      {controller.selectedTask ? (
        <View style={{ borderWidth: 1, borderColor: "#d8dce8", borderRadius: 14, backgroundColor: "#ffffff", padding: 12, gap: 8 }}>
          <Text style={{ color: "#1d2130", fontWeight: "700" }}>Current execution focus</Text>
          <Text style={{ color: "#1d2130" }}>{controller.selectedTask.title}</Text>
          {controller.activeSession && controller.activeSession.taskId === controller.selectedTask.id ? (
            <Text style={{ color: "#4d5468" }}>
              Session {controller.activeSession.state}
            </Text>
          ) : null}
          <Pressable
            onPress={() => controller.navigateToPrimarySurface("session")}
            style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d8dce8", backgroundColor: "#ffffff" }}
          >
            <Text style={{ color: "#2d3448", fontWeight: "600" }}>Open session</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
