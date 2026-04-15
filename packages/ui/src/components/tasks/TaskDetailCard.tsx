import React from "react";

type TaskDetailCardProps = {
  title: string;
  status: "todo" | "in_progress" | "done" | string;
  estimateLabel?: string;
  sourceLabel?: string;
  onStart?: () => void;
  onMarkDone?: () => void;
};

export function TaskDetailCard({ title, status, estimateLabel, sourceLabel, onStart, onMarkDone }: TaskDetailCardProps) {
  return (
    <section
      aria-label="Task detail card"
      style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px", display: "grid", gap: "12px" }}
    >
      <p style={{ margin: 0 }}>
        <strong>{title}</strong> · {status}
      </p>
      {(estimateLabel || sourceLabel) ? (
        <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: "20px" }}>
          {estimateLabel ? `Estimate: ${estimateLabel}` : null}
          {estimateLabel && sourceLabel ? " · " : null}
          {sourceLabel ? `Context: ${sourceLabel}` : null}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={onStart} disabled={!onStart || status !== "todo"}>
          Start session
        </button>
        <button type="button" onClick={onMarkDone} disabled={!onMarkDone || status === "done"}>
          Mark done
        </button>
      </div>
    </section>
  );
}
