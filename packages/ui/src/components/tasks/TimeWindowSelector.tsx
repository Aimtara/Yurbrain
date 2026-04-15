import React from "react";

export type TimeWindowOption = "2h" | "4h" | "6h" | "8h" | "24h" | "custom";

const labels: Record<TimeWindowOption, string> = {
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "24h": "24h",
  custom: "Custom"
};

type TimeWindowSelectorProps = {
  activeWindow: TimeWindowOption;
  customMinutes: number;
  disabled?: boolean;
  onWindowChange: (window: TimeWindowOption) => void;
  onCustomMinutesChange: (minutes: number) => void;
};

export function TimeWindowSelector({
  activeWindow,
  customMinutes,
  disabled,
  onWindowChange,
  onCustomMinutesChange
}: TimeWindowSelectorProps) {
  return (
    <section
      aria-label="Time window selector"
      style={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: "14px",
        display: "grid",
        gap: "12px"
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>Pick your planning window</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {(Object.keys(labels) as TimeWindowOption[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onWindowChange(option)}
            disabled={disabled}
            aria-pressed={activeWindow === option}
            style={{
              borderRadius: "999px",
              border: "1px solid #cbd5e1",
              padding: "6px 12px",
              background: activeWindow === option ? "#e2e8f0" : "#ffffff",
              fontWeight: activeWindow === option ? 700 : 500
            }}
          >
            {labels[option]}
          </button>
        ))}
      </div>

      {activeWindow === "custom" ? (
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
          Custom minutes
          <input
            type="number"
            min={30}
            max={720}
            value={customMinutes}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isNaN(next)) return;
              onCustomMinutesChange(next);
            }}
            disabled={disabled}
            style={{ width: "100px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "4px 8px" }}
          />
        </label>
      ) : null}
    </section>
  );
}
