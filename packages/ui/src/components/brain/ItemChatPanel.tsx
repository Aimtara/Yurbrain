import React from "react";

import { CommentComposer } from "../feed/CommentComposer";

type ItemChatPanelProps = {
  messages: string[];
  onSend: (value: string) => void;
  mode?: "standard" | "ai_query";
  fallbackNotice?: string;
};

export function ItemChatPanel({ messages, onSend, mode = "standard", fallbackNotice }: ItemChatPanelProps) {
  return (
    <section aria-label="Item chat panel">
      {mode === "ai_query" ? <p aria-label="chat-mode">AI query mode</p> : null}
      {fallbackNotice ? <p aria-label="fallback-notice">{fallbackNotice}</p> : null}
      <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
      <CommentComposer onSend={onSend} />
    </section>
  );
}
