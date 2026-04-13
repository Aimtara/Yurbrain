import React from "react";

type TaskDetailCardProps = {
  title: string;
  status: "todo" | "in_progress" | "done" | string;
  onStart?: () => void;
  onMarkDone?: () => void;
};

export function TaskDetailCard({ title, status, onStart, onMarkDone }: TaskDetailCardProps) {
  return (
    <section aria-label="Task detail card">
      <p>
        <strong>{title}</strong> · {status}
      </p>
      <div>
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
