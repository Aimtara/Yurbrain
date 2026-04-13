import React from "react";

export function ItemChatPanel({ messages }: { messages: string[] }) {
  return <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>;
}
