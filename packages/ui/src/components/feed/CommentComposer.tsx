import React, { useState } from "react";

export function CommentComposer({ onSend }: { onSend: (value: string) => void }) {
  const [value, setValue] = useState("");

  const send = () => {
    const normalized = value.trim();
    if (!normalized) return;
    onSend(normalized);
    setValue("");
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
    </div>
  );
}
