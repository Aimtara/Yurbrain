import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { MobileLoopController } from "../shell/types";

type SessionSurfaceProps = {
  controller: MobileLoopController;
};

export function SessionSurface({ controller }: SessionSurfaceProps) {
  const task = controller.selectedTask;
  const session = controller.selectedTaskSession;
  const elapsedLabel = controller.sessionElapsedLabel;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={panelStyle}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 6 }}>Execution session</Text>
        <Text style={{ color: "#475569", marginBottom: 10 }}>Focused, calm, minimal execution.</Text>
        {task ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 6 }}>{task.title}</Text>
            <Text style={{ color: "#475569", marginBottom: 8 }}>Status: {task.status}</Text>
          </>
        ) : (
          <Text style={{ color: "#475569", marginBottom: 8 }}>Pick a feed card or item plan first.</Text>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TouchableOpacity onPress={() => (task ? void controller.startTask(task.id) : undefined)} disabled={!task} style={actionButtonStyle}>
            <Text style={actionButtonTextStyle}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void controller.pauseSessionForSelectedTask()} disabled={!session || session.state !== "running"} style={actionButtonStyle}>
            <Text style={actionButtonTextStyle}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void controller.finishSessionForSelectedTask()} disabled={!session || session.state === "finished"} style={actionButtonStyle}>
            <Text style={actionButtonTextStyle}>Finish</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void controller.markTaskDone()} disabled={!task} style={actionButtonStyle}>
            <Text style={actionButtonTextStyle}>Mark done</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={sessionHeroStyle}>
        <Text style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>Focus mode</Text>
        <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "800", marginTop: 6 }}>{task?.title ?? "No task selected"}</Text>
        <Text style={{ color: "#cbd5e1", marginTop: 4 }}>{session ? `Session ${session.state}` : "No active session yet"}</Text>
        <Text style={{ color: "#ffffff", fontSize: 30, fontWeight: "800", marginTop: 10 }}>{elapsedLabel}</Text>
        {controller.executionContext ? (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#334155", backgroundColor: "rgba(15, 23, 42, 0.5)", padding: 10, marginTop: 10 }}>
            <Text style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Context peek</Text>
            <Text style={{ color: "#ffffff", fontWeight: "700", marginBottom: 4 }}>{controller.executionContext.title}</Text>
            <Text style={{ color: "#cbd5e1" }}>{controller.executionContext.content}</Text>
            <TouchableOpacity
              onPress={() => {
                if (!task?.sourceItemId) return;
                controller.openRelatedItem(task.sourceItemId);
              }}
              style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, borderColor: "#334155", paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>Open source item</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {controller.taskError ? <Text style={{ color: "#991b1b" }}>{controller.taskError}</Text> : null}
      {controller.surfaceNotice ? <Text style={{ color: "#1e3a8a" }}>{controller.surfaceNotice}</Text> : null}
    </ScrollView>
  );
}

const panelStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#d8dce8",
  backgroundColor: "#ffffff",
  padding: 12
} as const;

const sessionHeroStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#1e293b",
  backgroundColor: "#0b1220",
  padding: 14
} as const;

const actionButtonStyle = {
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#d8dce8",
  backgroundColor: "#ffffff",
  paddingHorizontal: 10,
  paddingVertical: 6
} as const;

const actionButtonTextStyle = {
  color: "#2d3448",
  fontWeight: "600"
} as const;
