import React from "react";

export function CommentComposer({ onSend }: { onSend: (value: string) => void }) {
  return <input placeholder="Add a comment" onKeyDown={(e) => e.key === "Enter" && onSend((e.target as HTMLInputElement).value)} />;
}
