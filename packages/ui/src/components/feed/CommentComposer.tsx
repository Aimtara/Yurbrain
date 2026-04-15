import React, { useState } from "react";

type CommentComposerProps = {
  onSend: (value: string) => void;
  onConfirmConvertToTask?: (value: string) => void;
};

export function CommentComposer({ onSend, onConfirmConvertToTask }: CommentComposerProps) {
  const [value, setValue] = useState("");
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const send = () => {
    const normalized = value.trim();
    if (!normalized) return;
    onSend(normalized);
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

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <input
        value={value}
        placeholder="Add a continuation note"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          send();
        }}
        style={{ borderRadius: "12px", border: "1px solid #cbd5e1", padding: "10px 12px" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <button type="button" onClick={send}>
          Send
        </button>
      {onConfirmConvertToTask ? (
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
