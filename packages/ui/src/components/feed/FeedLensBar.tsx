import React from "react";

export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";

const lensLabels: Record<FeedLens, string> = {
  all: "All",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recently commented"
};

export function FeedLensBar({ lenses, activeLens, onChange }: { lenses: FeedLens[]; activeLens: FeedLens; onChange: (lens: FeedLens) => void }) {
  return (
    <nav aria-label="Feed lenses">
      {lenses.map((lens) => (
        <button key={lens} type="button" onClick={() => onChange(lens)} aria-pressed={activeLens === lens}>
          {lensLabels[lens]}
        </button>
      ))}
    </nav>
  );
}
