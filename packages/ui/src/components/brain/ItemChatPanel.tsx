import React from "react";

import { CommentComposer } from "../feed/CommentComposer";

type ItemChatPanelProps = {
  messages: string[];
  onSend: (value: string) => void;
  mode?: "standard" | "ai_query";
  fallbackNotice?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

export function ItemChatPanel({ messages, onSend, mode = "standard", fallbackNotice, errorMessage, onRetry }: ItemChatPanelProps) {
  return (
    <section aria-label="Item chat panel">
      {mode === "ai_query" ? <p aria-label="chat-mode">AI query mode</p> : null}
      {fallbackNotice ? <p aria-label="fallback-notice">{fallbackNotice}</p> : null}
      {errorMessage ? <p aria-label="chat-error">{errorMessage}</p> : null}
      {messages.length === 0 ? <p aria-label="chat-empty">No messages yet. Ask a question to begin.</p> : null}
      {errorMessage && onRetry ? <button onClick={onRetry}>Retry query</button> : null}
      <ul>{messages.map((m, index) => <li key={`${m}-${index}`}>{m}</li>)}</ul>
      <CommentComposer onSend={onSend} />
    </section>
  );
}
