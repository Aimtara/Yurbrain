import React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function CaptureComposer({ value, onChange, onSubmit }: Props) {
  return (
    <div>
      <label htmlFor="capture-composer">CaptureComposer</label>
      <textarea id="capture-composer" value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      <button type="button" onClick={onSubmit}>Save</button>
    </div>
  );
}
