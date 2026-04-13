import React from "react";

import { CommentComposer } from "../feed/CommentComposer";

export function ItemChatPanel({ messages, onSend }: { messages: string[]; onSend: (value: string) => void }) {
  return (
    <section aria-label="Item chat panel">
      <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
      <CommentComposer onSend={onSend} />
    </section>
  );
}
