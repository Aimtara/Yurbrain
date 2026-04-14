import React from "react";

type FounderModeToggleProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

export function FounderModeToggle({ enabled, onToggle }: FounderModeToggleProps) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        padding: "8px 12px",
        background: enabled ? "#eff6ff" : "#ffffff"
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Founder mode</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label="Toggle founder mode lens"
      />
    </label>
  );
}
