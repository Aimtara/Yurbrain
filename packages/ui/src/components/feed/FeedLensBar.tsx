import React, { useId } from "react";
import { tokens } from "../../design/tokens";

export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";

const lensLabels: Record<FeedLens, string> = {
  all: "Mixed",
  keep_in_mind: "Keep nearby",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In motion",
  recently_commented: "Recent notes"
};

export function FeedLensBar({ lenses, activeLens, onChange }: { lenses: FeedLens[]; activeLens: FeedLens; onChange: (lens: FeedLens) => void }) {
  const hintId = useId();

  return (
    <div style={{ marginBottom: `${tokens.space.sm + 2}px` }}>
      <nav aria-label="Feed lenses" aria-describedby={hintId} style={{ display: "flex", flexWrap: "wrap", gap: `${tokens.space.sm}px` }}>
        {lenses.map((lens) => (
          <button
            key={lens}
            type="button"
            onClick={() => onChange(lens)}
            aria-pressed={activeLens === lens}
            aria-label={`${lensLabels[lens]} lens`}
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
      <p id={hintId} style={{ margin: `${tokens.space.sm}px 0 0`, color: feedPalette.hintText }}>
        <small>{lensHints[activeLens]}</small>
      </p>
    </div>
  );
}

const lensHints: Record<FeedLens, string> = {
  all: "A balanced window into what is worth revisiting now.",
  keep_in_mind: "Light cues to keep in view while you think.",
  open_loops: "Threads that feel close to useful closure.",
  learning: "Ideas with takeaways you can reuse quickly.",
  in_progress: "Work already moving, so momentum stays easy.",
  recently_commented: "Thoughts you recently continued or clarified."
};

const feedPalette = {
  border: "#d9d9df",
  activeBackground: "#f1f4ff",
  activeText: "#2f3650",
  defaultText: "#3b4157",
  hintText: "#5a6072"
};
