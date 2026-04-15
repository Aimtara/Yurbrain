import React, { useEffect, useRef, useState } from "react";

export type CaptureSubmitIntent = "save" | "save_and_plan" | "save_and_remind";

type Props = {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (intent: CaptureSubmitIntent) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  statusMessage?: string;
  successMessage?: string;
  onVoiceStub?: () => void;
};

export function CaptureComposer({
  isOpen,
  value,
  onChange,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  statusMessage,
  successMessage,
  onVoiceStub
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const setViewportMode = () => {
      setIsCompact(window.innerWidth < 768);
    };
    setViewportMode();
    window.addEventListener("resize", setViewportMode);
    return () => {
      window.removeEventListener("resize", setViewportMode);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    const cursorPosition = node.value.length;
    node.setSelectionRange(cursorPosition, cursorPosition);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 280)}px`;
  }, [isOpen, value]);

  if (!isOpen) return null;

  return (
    <div
      aria-label="Capture sheet overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: isCompact ? "flex-end" : "center",
        zIndex: 40,
        padding: isCompact ? "0" : "24px"
      }}
    >
      <div
        role="button"
        aria-label="Close capture sheet backdrop"
        tabIndex={0}
        onClick={() => {
          if (isSubmitting) return;
          onClose();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (isSubmitting) return;
          onClose();
        }}
        style={{ position: "absolute", inset: 0 }}
      />
      <section
        aria-label="Capture sheet"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: isCompact ? "100%" : "680px",
          borderRadius: isCompact ? "24px 24px 0 0" : "24px",
          border: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "20px",
          display: "grid",
          gap: "14px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Capture</h3>
            <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "14px" }}>Capture first. Decide what to do next after.</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                onVoiceStub?.();
              }}
              aria-label="Voice capture stub"
            >
              Voice
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }} aria-label="Attachment placeholders">
          <span style={placeholderChipStyle}>Link placeholder</span>
          <span style={placeholderChipStyle}>Image placeholder</span>
          <span style={placeholderChipStyle}>Voice memo placeholder</span>
        </div>

        <textarea
          id="capture-composer"
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder="Capture in your own words..."
          style={{
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            padding: "12px",
            resize: "none",
            minHeight: "96px",
            maxHeight: "280px",
            overflowY: "auto"
          }}
        />

        {successMessage ? (
          <p style={{ margin: 0, color: "#0f766e", fontWeight: 600 }}>{successMessage}</p>
        ) : null}
        {statusMessage ? <p style={{ margin: 0, color: "#334155" }}>{statusMessage}</p> : null}
        {errorMessage ? <p style={{ margin: 0, color: "#991b1b" }}>{errorMessage}</p> : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            onClick={() => onSubmit("save")}
            disabled={isSubmitting || !value.trim()}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => onSubmit("save_and_plan")}
            disabled={isSubmitting || !value.trim()}
          >
            Save + Plan
          </button>
          <button
            type="button"
            onClick={() => onSubmit("save_and_remind")}
            disabled={isSubmitting || !value.trim()}
          >
            Save + Remind Later
          </button>
        </div>
      </section>
    </div>
  );
}

const placeholderChipStyle: React.CSSProperties = {
  borderRadius: "999px",
  border: "1px dashed #cbd5e1",
  padding: "4px 10px",
  fontSize: "12px",
  color: "#475569"
};
