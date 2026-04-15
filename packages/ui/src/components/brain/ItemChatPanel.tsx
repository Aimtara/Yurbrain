import React from "react";

import { CommentComposer } from "../feed/CommentComposer";

type ItemChatPanelProps = {
  messages: string[];
  onSend: (value: string) => void;
  mode?: "standard" | "ai_query";
  fallbackNotice?: string;
  errorMessage?: string;
  onRetry?: () => void;
  hideComposer?: boolean;
};

export function ItemChatPanel({ messages, onSend, mode = "standard", fallbackNotice, errorMessage, onRetry, hideComposer = false }: ItemChatPanelProps) {
  return (
    <section aria-label="Item chat panel" style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "10px" }}>
      {mode === "ai_query" ? <p aria-label="chat-mode" style={{ margin: 0, fontSize: "13px", color: "#475569" }}>AI query mode</p> : null}
      {fallbackNotice ? <p aria-label="fallback-notice" style={{ margin: 0 }}>{fallbackNotice}</p> : null}
      {errorMessage ? <p aria-label="chat-error" style={{ margin: 0 }}>{errorMessage}</p> : null}
      {messages.length === 0 ? <p aria-label="chat-empty" style={{ margin: 0 }}>No messages yet. Ask a question to begin.</p> : null}
      {errorMessage && onRetry ? <button onClick={onRetry}>Retry query</button> : null}
      <ul style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "6px" }}>
        {messages.map((m, index) => (
          <li key={`${m}-${index}`}>{m}</li>
        ))}
      </ul>
      {!hideComposer ? <CommentComposer onSend={onSend} /> : null}
    </section>
  );
}
