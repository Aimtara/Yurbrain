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
    <div>
      <input
        value={value}
        placeholder="Add a comment"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          send();
        }}
      />
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
            <div role="dialog" aria-label="Confirm comment to task conversion">
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
  );
}
