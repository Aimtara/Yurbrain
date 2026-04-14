import React from "react";

type TaskDetailCardProps = {
  title: string;
  status: "todo" | "in_progress" | "done" | string;
  onStart?: () => void;
  onMarkDone?: () => void;
};

export function TaskDetailCard({ title, status, onStart, onMarkDone }: TaskDetailCardProps) {
  return (
    <section
      aria-label="Task detail card"
      style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px", display: "grid", gap: "12px" }}
    >
      <p style={{ margin: 0 }}>
        <strong>{title}</strong> · {status}
      </p>
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
