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
    <nav aria-label="Feed lenses" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {lenses.map((lens) => (
        <button
          key={lens}
          type="button"
          onClick={() => onChange(lens)}
          aria-pressed={activeLens === lens}
          style={{
            borderRadius: "999px",
            border: "1px solid #cbd5e1",
            padding: "8px 12px",
            background: activeLens === lens ? "#eff6ff" : "#ffffff",
            color: "#0f172a"
          }}
        >
          {lensLabels[lens]}
        </button>
      ))}
    </nav>
  );
}
