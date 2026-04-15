import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function CaptureComposer({ value, onChange, onSubmit }: Props) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <label htmlFor="capture-composer" style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
        Capture thought
      </label>
      <textarea
        id="capture-composer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Capture in your own words..."
        style={{ borderRadius: "12px", border: "1px solid #cbd5e1", padding: "10px 12px", resize: "vertical" }}
      />
      <div>
        <button type="button" onClick={onSubmit}>
          Save to feed
        </button>
      </div>
    </div>
  );
}
