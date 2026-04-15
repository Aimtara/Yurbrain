import React from "react";

export type ExecutionLens = "all" | "ready_to_move" | "needs_unblock" | "momentum";

const lensLabels: Record<ExecutionLens, string> = {
  all: "All",
  ready_to_move: "Ready to move",
  needs_unblock: "Needs unblock",
  momentum: "Momentum"
};

type ExecutionLensBarProps = {
  activeLens: ExecutionLens;
  onChange: (lens: ExecutionLens) => void;
};

export function ExecutionLensBar({ activeLens, onChange }: ExecutionLensBarProps) {
  return (
    <nav aria-label="Execution lens" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {(Object.keys(lensLabels) as ExecutionLens[]).map((lens) => (
        <button
          key={lens}
          type="button"
          onClick={() => onChange(lens)}
          aria-pressed={activeLens === lens}
          style={{
            borderRadius: "999px",
            border: "1px solid #cbd5e1",
            padding: "8px 12px",
            background: activeLens === lens ? "#eff6ff" : "#ffffff"
          }}
        >
          {lensLabels[lens]}
        </button>
      ))}
    </nav>
  );
}
