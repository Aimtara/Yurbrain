import React from "react";

export function CommentComposer({ onSend }: { onSend: (value: string) => void }) {
  return (
    <input
      placeholder="Add a comment"
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const input = e.target as HTMLInputElement;
        const value = input.value.trim();
        if (!value) return;
        onSend(value);
        input.value = "";
      }}
    />
  );
}
