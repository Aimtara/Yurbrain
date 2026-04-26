import { useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import type { CaptureDraft, CaptureSubmitIntent } from "../shared/types";

type AppCaptureSheetProps = {
  open: boolean;
  draft: CaptureDraft;
  loading: boolean;
  errorMessage: string;
  statusMessage: string;
  successMessage: string;
  onClose: () => void;
  onChangeDraft: (draft: CaptureDraft) => void;
  onSubmit: (intent: CaptureSubmitIntent) => Promise<void>;
};

const storageEnabled = process.env.EXPO_PUBLIC_YURBRAIN_STORAGE_ENABLED === "true";
const captureTypeOptions: Array<CaptureDraft["type"]> = storageEnabled ? ["text", "link", "image"] : ["text", "link"];

const captureTypeLabels: Record<CaptureDraft["type"], string> = {
  text: "Text",
  link: "Link",
  image: "Image ref"
};

const captureContentPlaceholders: Record<CaptureDraft["type"], string> = {
  text: "Capture in your own words...",
  link: "https://example.com/article-you-want-to-remember",
  image: storageEnabled ? "Paste an image URL or file reference" : "Image capture is deferred for this launch"
};

export function AppCaptureSheet({
  open,
  draft,
  loading,
  errorMessage,
  statusMessage,
  successMessage,
  onClose,
  onChangeDraft,
  onSubmit
}: AppCaptureSheetProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const canSubmit = useMemo(() => draft.content.trim().length > 0, [draft.content]);
  const safeDraftType = !storageEnabled && draft.type === "image" ? "text" : draft.type;
  const safeDraft = safeDraftType === draft.type ? draft : { ...draft, type: safeDraftType };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.35)" }}>
        <Pressable style={{ flex: 1 }} onPress={loading ? undefined : onClose} accessibilityRole="button" accessibilityLabel="Close capture sheet backdrop" />
        <View
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderBottomWidth: 0,
            backgroundColor: "#ffffff",
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 22,
            gap: 10
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>Capture</Text>
              <Text style={{ color: "#475569" }}>Fast capture first. Decide next after save.</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
              style={{
                borderWidth: 1,
                borderColor: "#d8dce8",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: "#ffffff"
              }}
            >
              <Text style={{ color: "#334155", fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>

          <Text style={{ color: "#64748b" }}>Quick capture first. Add details only if useful.</Text>

          <TextInput
            multiline
            autoFocus
            value={draft.content}
            onChangeText={(content) => onChangeDraft({ ...draft, content })}
            placeholder={captureContentPlaceholders[safeDraft.type]}
            accessibilityLabel="Capture content"
            style={{
              minHeight: 120,
              maxHeight: 260,
              textAlignVertical: "top",
              borderWidth: 1,
              borderColor: "#d8dce8",
              borderRadius: 14,
              backgroundColor: "#ffffff",
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#0f172a",
              fontSize: 16,
              lineHeight: 22
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: "#64748b" }}>
              Mode: <Text style={{ color: "#1e293b", fontWeight: "700" }}>{captureTypeLabels[safeDraft.type]}</Text>
            </Text>
            <Pressable
              onPress={() => setAdvancedOpen((current) => !current)}
              accessibilityRole="button"
              style={{
                borderWidth: 1,
                borderColor: "#d8dce8",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: "#ffffff"
              }}
            >
              <Text style={{ color: "#334155", fontWeight: "600" }}>{advancedOpen ? "Hide options" : "More options"}</Text>
            </Pressable>
          </View>

          {advancedOpen ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {captureTypeOptions.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => onChangeDraft({ ...draft, type })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.type === type }}
                    style={{
                      borderWidth: 1,
                      borderColor: safeDraft.type === type ? "#93c5fd" : "#d8dce8",
                      backgroundColor: safeDraft.type === type ? "#eff6ff" : "#ffffff",
                      borderRadius: 999,
                      paddingVertical: 6,
                      paddingHorizontal: 10
                    }}
                  >
                    <Text style={{ color: "#1e293b", fontWeight: safeDraft.type === type ? "700" : "500" }}>{captureTypeLabels[type]}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={draft.source}
                onChangeText={(source) => onChangeDraft({ ...draft, source })}
                placeholder="Source (optional)"
                accessibilityLabel="Capture source optional"
                style={{
                  borderWidth: 1,
                  borderColor: "#d8dce8",
                  borderRadius: 12,
                  backgroundColor: "#ffffff",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  color: "#0f172a"
                }}
              />

              <TextInput
                multiline
                value={draft.note}
                onChangeText={(note) => onChangeDraft({ ...draft, note })}
                placeholder="Why this matters later (optional)"
                accessibilityLabel="Capture note optional"
                style={{
                  minHeight: 70,
                  textAlignVertical: "top",
                  borderWidth: 1,
                  borderColor: "#d8dce8",
                  borderRadius: 12,
                  backgroundColor: "#ffffff",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  color: "#0f172a"
                }}
              />
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#d8dce8",
                  borderRadius: 10,
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  gap: 4
                }}
              >
                <Text style={{ color: "#334155", fontWeight: "600" }}>
                  Not yet in MVP:
                </Text>
                <Text style={{ color: "#64748b" }}>
                  Native file uploads, voice capture, and reminder scheduling are post-alpha and hidden from production launch scope.
                </Text>
              </View>
            </View>
          ) : null}

          {loading ? <Text style={{ color: "#334155" }}>Saving capture...</Text> : null}
          {statusMessage ? <Text style={{ color: "#334155" }}>{statusMessage}</Text> : null}
          {successMessage ? <Text style={{ color: "#0f766e" }}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={{ color: "#991b1b" }}>{errorMessage}</Text> : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <CaptureActionButton disabled={loading || !canSubmit} label="Save" onPress={() => void onSubmit("save")} primary />
            {advancedOpen ? (
              <>
                <CaptureActionButton disabled={loading || !canSubmit} label="Save + Plan" onPress={() => void onSubmit("save_and_plan")} />
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CaptureActionButton({ disabled, label, onPress, primary = false }: { disabled: boolean; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{
        borderWidth: 1,
        borderColor: primary ? "#0f172a" : "#cbd5e1",
        borderRadius: 999,
        backgroundColor: disabled ? "#f1f5f9" : primary ? "#0f172a" : "#ffffff",
        paddingVertical: 8,
        paddingHorizontal: 12,
        opacity: disabled ? 0.7 : 1
      }}
    >
      <Text style={{ color: primary ? "#ffffff" : "#1e293b", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
