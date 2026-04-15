import React, { useEffect, useMemo, useState } from "react";

type ActiveSessionScreenProps = {
  state: "running" | "paused" | "finished" | string;
  taskTitle?: string;
  startedAt?: string;
  endedAt?: string | null;
  contextPeek?: {
    title: string;
    content: string;
    hint?: string;
  } | null;
  onPause?: () => void;
  onFinish?: () => void;
  onReturnToFeed?: () => void;
  onOpenSource?: () => void;
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

function formatElapsed(startedAt: string | undefined, endedAt: string | null | undefined, nowMs: number): string {
  if (!startedAt) return "00:00";
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return "00:00";
  const endedMs = endedAt ? new Date(endedAt).getTime() : nowMs;
  const safeEndedMs = Number.isFinite(endedMs) ? endedMs : nowMs;
  const elapsedSeconds = Math.max(0, Math.floor((safeEndedMs - startedMs) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ActiveSessionScreen({
  state,
  taskTitle,
  startedAt,
  endedAt,
  contextPeek,
  onPause,
  onFinish,
  onReturnToFeed,
  onOpenSource
}: ActiveSessionScreenProps) {
  const copy = stateCopy[state] ?? {
    title: `Session ${state}`,
    helper: "Track your current execution state."
  };
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (state !== "running") return;
    const handle = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, [state]);

  const elapsedLabel = useMemo(() => formatElapsed(startedAt, endedAt, nowMs), [endedAt, nowMs, startedAt]);

  return (
    <section
      aria-label="Active session screen"
      style={{
        borderRadius: "24px",
        background: "#0b1220",
        color: "#f8fafc",
        border: "1px solid #1e293b",
        padding: "24px",
        display: "grid",
        gap: "16px"
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>Focus mode</p>
        {taskTitle ? <h3 style={{ margin: "8px 0 0", fontSize: "34px", lineHeight: "40px", fontWeight: 800 }}>{taskTitle}</h3> : null}
        <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: "18px", lineHeight: "24px" }}>{copy.title}</p>
        <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>{copy.helper}</p>
      </div>

      <div
        style={{
          borderRadius: "16px",
          border: "1px solid #334155",
          background: "rgba(15, 23, 42, 0.5)",
          padding: "14px",
          display: "grid",
          gap: "6px"
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>Session timer</p>
        <p style={{ margin: 0, fontSize: "30px", lineHeight: "36px", fontVariantNumeric: "tabular-nums" }}>{elapsedLabel}</p>
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

      {contextPeek ? (
        <div
          style={{
            borderRadius: "16px",
            border: "1px solid #334155",
            background: "rgba(15, 23, 42, 0.5)",
            padding: "14px",
            display: "grid",
            gap: "8px"
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>Context peek</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{contextPeek.title}</p>
          <p style={{ margin: 0, color: "#cbd5e1", lineHeight: "20px" }}>{contextPeek.content}</p>
          {contextPeek.hint ? <p style={{ margin: 0, color: "#94a3b8" }}>{contextPeek.hint}</p> : null}
          {onOpenSource ? (
            <div>
              <button type="button" onClick={onOpenSource} style={{ minHeight: "40px", padding: "0 12px" }}>
                Open source item
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
