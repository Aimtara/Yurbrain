import React, { useEffect, useRef, useState } from "react";

export type CaptureSubmitIntent = "save" | "save_and_plan" | "save_and_remind";
export type CaptureComposerValue = {
  type: "text" | "link" | "image";
  content: string;
  source: string;
  note: string;
};

type Props = {
  isOpen: boolean;
  value: CaptureComposerValue;
  onChange: (value: CaptureComposerValue) => void;
  onClose: () => void;
  onSubmit: (intent: CaptureSubmitIntent) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  statusMessage?: string;
  successMessage?: string;
  productionMode?: boolean;
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
  productionMode = false
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const canSubmit = value.content.trim().length > 0;

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
    const cursorPosition = value.content.length;
    node.setSelectionRange(cursorPosition, cursorPosition);
  }, [isOpen, value.content]);

  useEffect(() => {
    if (!isOpen) return;
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 280)}px`;
  }, [isOpen, value.content]);

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
            <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "14px" }}>Save it now. Yurbrain will help you find it again and continue later.</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {productionMode ? null : (
              <span
                aria-label="Voice capture availability"
                style={{
                  borderRadius: "999px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "6px 10px"
                }}
              >
                Voice capture (post-alpha)
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }} aria-label="Capture type">
          {captureTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...value, type })}
              disabled={isSubmitting}
              style={{
                ...typeChipStyle,
                background: value.type === type ? "#e0f2fe" : "#ffffff",
                borderColor: value.type === type ? "#38bdf8" : "#cbd5e1"
              }}
            >
              {captureTypeLabels[type]}
            </button>
          ))}
        </div>

        <label htmlFor="capture-content" style={fieldLabelStyle}>
          {contentFieldLabels[value.type]}
        </label>
        <textarea
          id="capture-content"
          ref={textareaRef}
          value={value.content}
          onChange={(event) => onChange({ ...value, content: event.target.value })}
          rows={3}
          placeholder={contentFieldPlaceholders[value.type]}
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

        <div style={{ display: "grid", gap: "8px" }}>
          <label htmlFor="capture-source" style={fieldLabelStyle}>
            Source (optional)
          </label>
          <input
            id="capture-source"
            type="text"
            value={value.source}
            onChange={(event) => onChange({ ...value, source: event.target.value })}
            placeholder="e.g. Slack, Twitter, Newsletter, copied from docs..."
            style={textInputStyle}
          />
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          <label htmlFor="capture-note" style={fieldLabelStyle}>
            Note (optional)
          </label>
          <textarea
            id="capture-note"
            value={value.note}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            rows={2}
            placeholder="Why this matters or what to remember on resurfacing."
            style={{ ...textInputStyle, minHeight: "72px", resize: "vertical" }}
          />
        </div>

        {successMessage ? (
          <p style={{ margin: 0, color: "#0f766e", fontWeight: 600 }}>{successMessage}</p>
        ) : null}
        {statusMessage ? <p style={{ margin: 0, color: "#334155" }}>{statusMessage}</p> : null}
        {errorMessage ? <p style={{ margin: 0, color: "#991b1b" }}>{errorMessage}</p> : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            onClick={() => onSubmit("save")}
            disabled={isSubmitting || !canSubmit}
          >
            Save capture
          </button>
          <button
            type="button"
            onClick={() => onSubmit("save_and_plan")}
            disabled={isSubmitting || !canSubmit}
            title="Use after the capture already has a clear next move."
          >
            Save + Plan if clear
          </button>
          {productionMode ? null : (
            <button type="button" disabled aria-disabled style={{ opacity: 0.6 }}>
              Reminder scheduling (post-alpha)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

const captureTypes: Array<CaptureComposerValue["type"]> = ["text", "link", "image"];

const captureTypeLabels: Record<CaptureComposerValue["type"], string> = {
  text: "Text",
  link: "Link",
  image: "Image ref"
};

const contentFieldLabels: Record<CaptureComposerValue["type"], string> = {
  text: "Content",
  link: "Link URL",
  image: "Image URL or file reference"
};

const contentFieldPlaceholders: Record<CaptureComposerValue["type"], string> = {
  text: "Capture in your own words...",
  link: "https://example.com/article-you-want-to-remember",
  image: "Paste image URL; native uploads are not part of the current production scope"
};

const typeChipStyle: React.CSSProperties = {
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  padding: "6px 12px",
  fontSize: "12px",
  color: "#0f172a",
  fontWeight: 600
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: "13px",
  fontWeight: 600
};

const textInputStyle: React.CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  width: "100%",
  fontFamily: "inherit",
  fontSize: "14px"
};
