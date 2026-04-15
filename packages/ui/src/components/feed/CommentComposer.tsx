import React, { useState } from "react";

export type CommentComposerMode = "comment" | "ask_yurbrain";

type CommentComposerProps = {
  onSend: (value: string) => void;
  onAskYurbrain?: (value: string) => void;
  onConfirmConvertToTask?: (value: string) => void;
  enableAskYurbrain?: boolean;
  defaultMode?: CommentComposerMode;
};

export function CommentComposer({ onSend, onAskYurbrain, onConfirmConvertToTask, enableAskYurbrain = false, defaultMode = "comment" }: CommentComposerProps) {
  const [value, setValue] = useState("");
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const canAskYurbrain = enableAskYurbrain && typeof onAskYurbrain === "function";
  const [mode, setMode] = useState<CommentComposerMode>(defaultMode === "ask_yurbrain" && canAskYurbrain ? "ask_yurbrain" : "comment");
  const isAskMode = mode === "ask_yurbrain";

  const send = () => {
    const normalized = value.trim();
    if (!normalized) return;
    if (isAskMode && canAskYurbrain) {
      onAskYurbrain(normalized);
    } else {
      onSend(normalized);
    }
    setValue("");
    setShowConvertConfirm(false);
  };

  const confirmConvert = () => {
    const normalized = value.trim();
    if (!normalized || !onConfirmConvertToTask) return;

    onConfirmConvertToTask(normalized);
    setValue("");
    setShowConvertConfirm(false);
  };

  const rows = Math.min(8, Math.max(2, value.split("\n").length));

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      {canAskYurbrain ? (
        <div role="tablist" aria-label="Comment composer mode" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "comment"}
            onClick={() => {
              setMode("comment");
              setShowConvertConfirm(false);
            }}
          >
            Comment
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isAskMode}
            onClick={() => {
              setMode("ask_yurbrain");
              setShowConvertConfirm(false);
            }}
          >
            Ask Yurbrain
          </button>
        </div>
      ) : null}
      <textarea
        value={value}
        rows={rows}
        placeholder={isAskMode ? "Ask Yurbrain about this item..." : "Add a continuation note"}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return;
          e.preventDefault();
          send();
        }}
        style={{
          borderRadius: "12px",
          border: isAskMode ? "1px solid #bfdbfe" : "1px solid #cbd5e1",
          background: isAskMode ? "#eff6ff" : "#ffffff",
          padding: "10px 12px",
          resize: "vertical"
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <button type="button" onClick={send}>
          {isAskMode ? "Ask Yurbrain" : "Send comment"}
        </button>
        {!isAskMode && onConfirmConvertToTask ? (
          <>
            <button
              type="button"
              onClick={() => setShowConvertConfirm((current) => !current)}
              disabled={!value.trim()}
              aria-label="Convert comment to task"
            >
              Convert to task
            </button>
            {showConvertConfirm ? (
              <div role="dialog" aria-label="Confirm comment to task conversion" style={{ border: "1px solid #cbd5e1", borderRadius: "12px", padding: "12px" }}>
                <p>Convert this comment into a task with source linkage?</p>
                <button type="button" onClick={confirmConvert}>
                  Confirm convert
                </button>
                <button type="button" onClick={() => setShowConvertConfirm(false)}>
                  Cancel
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
