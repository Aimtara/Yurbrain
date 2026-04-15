import React from "react";

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
    <div>
      <nav aria-label="Feed lenses">
        {lenses.map((lens) => (
          <button key={lens} type="button" onClick={() => onChange(lens)} aria-pressed={activeLens === lens}>
            {lensLabels[lens]}
          </button>
        ))}
      </nav>
      <p>
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
