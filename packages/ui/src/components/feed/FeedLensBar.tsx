import React from "react";

export function FeedLensBar({ lenses, activeLens, onChange }: { lenses: string[]; activeLens: string; onChange: (lens: string) => void }) {
  return (
    <nav aria-label="Feed lenses">
      {lenses.map((lens) => (
        <button key={lens} type="button" onClick={() => onChange(lens)} aria-pressed={activeLens === lens}>
          {lens}
        </button>
      ))}
    </nav>
  );
}
