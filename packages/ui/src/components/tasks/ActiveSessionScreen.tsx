import React from "react";

type ActiveSessionScreenProps = {
  state: "running" | "paused" | "finished" | string;
  taskTitle?: string;
  onPause?: () => void;
  onFinish?: () => void;
  onReturnToFeed?: () => void;
};

const stateCopy: Record<string, { title: string; helper: string }> = {
  running: {
    title: "In focus",
    helper: "Keep this step lightweight. Momentum matters more than perfection."
  },
  paused: {
    title: "Session paused",
    helper: "You can resume when context is fresh."
  },
  finished: {
    title: "Session complete",
    helper: "Close the loop and return to your feed."
  }
};

export function ActiveSessionScreen({ state, taskTitle, onPause, onFinish, onReturnToFeed }: ActiveSessionScreenProps) {
  const copy = stateCopy[state] ?? {
    title: `Session ${state}`,
    helper: "Track your current execution state."
  };

  return (
    <section
      aria-label="Active session screen"
      style={{
        borderRadius: "24px",
        background: "#0f172a",
        color: "#f8fafc",
        border: "1px solid #334155",
        padding: "24px",
        display: "grid",
        gap: "16px"
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase", color: "#cbd5e1" }}>Session</p>
        <h3 style={{ margin: "6px 0 0", fontSize: "32px", lineHeight: "38px" }}>{copy.title}</h3>
        {taskTitle ? <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{taskTitle}</p> : null}
        <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>{copy.helper}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <button type="button" onClick={onPause} disabled={!onPause || state !== "running"} style={{ minHeight: "52px", padding: "0 16px" }}>
          Pause
        </button>
        <button type="button" onClick={onFinish} disabled={!onFinish || state === "finished"} style={{ minHeight: "52px", padding: "0 16px" }}>
          Finish
        </button>
        {onReturnToFeed ? (
          <button type="button" onClick={onReturnToFeed} style={{ minHeight: "52px", padding: "0 16px" }}>
            Return to feed
          </button>
        ) : null}
      </div>
    </section>
  );
}
