import React from "react";
import { tokens } from "../../design/tokens";

export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";

const lensLabels: Record<FeedLens, string> = {
  all: "All",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recent comments"
};

export function FeedLensBar({ lenses, activeLens, onChange }: { lenses: FeedLens[]; activeLens: FeedLens; onChange: (lens: FeedLens) => void }) {
  return (
    <div style={{ marginBottom: `${tokens.space.sm + 2}px` }}>
      <nav aria-label="Feed lenses" style={{ display: "flex", flexWrap: "wrap", gap: `${tokens.space.sm}px` }}>
        {lenses.map((lens) => (
          <button
            key={lens}
            type="button"
            onClick={() => onChange(lens)}
            aria-pressed={activeLens === lens}
            style={{
              border: `1px solid ${feedPalette.border}`,
              borderRadius: "999px",
              padding: `${tokens.space.xs + 2}px ${tokens.space.sm + 2}px`,
              background: activeLens === lens ? feedPalette.activeBackground : "#fff",
              color: activeLens === lens ? feedPalette.activeText : feedPalette.defaultText,
              fontWeight: activeLens === lens ? 600 : 500
            }}
          >
            {lensLabels[lens]}
          </button>
        ))}
      </nav>
      <p style={{ margin: `${tokens.space.sm}px 0 0`, color: feedPalette.hintText }}>
        <small>{lensHints[activeLens]}</small>
      </p>
    </div>
  );
}

const lensHints: Record<FeedLens, string> = {
  all: "A balanced mix of memories worth resurfacing now.",
  keep_in_mind: "Gentle reminders to keep nearby while thinking.",
  open_loops: "Unfinished threads that may need closure.",
  learning: "Ideas and notes with reusable takeaways.",
  in_progress: "Things already in motion so momentum stays intact.",
  recently_commented: "Memories you recently discussed or updated."
};

const feedPalette = {
  border: "#d9d9df",
  activeBackground: "#f1f4ff",
  activeText: "#2f3650",
  defaultText: "#3b4157",
  hintText: "#5a6072"
};
