import React from "react";

export type FeedCardVariant = "default" | "execution" | "blocked" | "done" | "resume";
export type FeedCardAction = "open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh";

export function FeedCard({
  variant = "default",
  badge,
  cardType,
  title,
  body,
  whyShown,
  lastTouched,
  continuityNote,
  nextStep,
  whereLeftOff,
  availableActions,
  primaryActionLabel,
  onOpen,
  onConvertToTask,
  onDismiss,
  onSnooze,
  onRefresh
}: {
  variant?: FeedCardVariant;
  badge?: string;
  cardType?: string;
  title: string;
  body: string;
  whyShown?: { summary: string; reasons: string[] } | string;
  lastTouched?: string;
  continuityNote?: string;
  nextStep?: string;
  whereLeftOff?: string;
  availableActions?: FeedCardAction[];
  primaryActionLabel?: string;
  onOpen?: () => void;
  onConvertToTask?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  const whyShownSummary = typeof whyShown === "string" ? whyShown : whyShown?.summary;
  const whyShownReasons = typeof whyShown === "string" ? [] : whyShown?.reasons ?? [];

  const variantStyles: Record<FeedCardVariant, React.CSSProperties> = {
    default: { border: "1px solid #e2e8f0", background: "#ffffff" },
    execution: { border: "1px solid #c7d2fe", background: "#eef2ff" },
    blocked: { border: "1px solid #fcd34d", background: "#fffbeb" },
    done: { border: "1px solid #99f6e4", background: "#f0fdfa" },
    resume: { border: "1px solid #bfdbfe", background: "#eff6ff" }
  };

  return (
    <article
      style={{
        borderRadius: "20px",
        padding: "20px",
        display: "grid",
        gap: "12px",
        minHeight: "220px",
        ...variantStyles[variant]
      }}
      aria-label={`Feed card ${variant}`}
    >
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {badge ? (
          <span style={{ borderRadius: "999px", border: "1px solid #cbd5e1", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
            {badge}
          </span>
        ) : null}
        {cardType ? (
          <span style={{ borderRadius: "999px", border: "1px solid #cbd5e1", padding: "4px 10px", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            {cardType.replaceAll("_", " ")}
          </span>
        ) : null}
        <span style={{ borderRadius: "999px", border: "1px solid #cbd5e1", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
          {variant}
        </span>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: "20px", lineHeight: "26px" }}>{title}</h3>
        <p style={{ margin: "8px 0 0", color: "#334155" }}>{body}</p>
      </div>
      {whyShownSummary ? (
        <div style={{ borderRadius: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px" }}>
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            Why shown
          </p>
          <p style={{ margin: "6px 0 0", color: "#1e293b" }}>{whyShownSummary}</p>
          {whyShownReasons.length > 0 ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", color: "#475569" }}>
              {whyShownReasons.slice(0, 2).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {(lastTouched || whereLeftOff || continuityNote || nextStep) ? (
        <div style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "14px" }}>
          {lastTouched ? (
            <p style={{ margin: 0 }}>
              <strong>Last touched:</strong> {lastTouched}
            </p>
          ) : null}
          {whereLeftOff ? (
            <p style={{ margin: 0 }}>
              <strong>Where you left off:</strong> {whereLeftOff}
            </p>
          ) : null}
          {continuityNote ? (
            <p style={{ margin: 0 }}>
              <strong>Since then:</strong> {continuityNote}
            </p>
          ) : null}
          {nextStep ? (
            <p style={{ margin: 0 }}>
              <strong>Next move:</strong> {nextStep}
            </p>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {onOpen && (!availableActions || availableActions.includes("open_item") || availableActions.includes("open_task") || availableActions.includes("start_session")) ? (
          <button type="button" onClick={onOpen}>
            {primaryActionLabel ?? "Open continuity"}
          </button>
        ) : null}
        {onConvertToTask && (!availableActions || availableActions.includes("convert_to_task")) ? <button onClick={onConvertToTask}>Plan next step</button> : null}
        {onSnooze && (!availableActions || availableActions.includes("snooze")) ? <button onClick={() => onSnooze(120)}>Snooze 2h</button> : null}
        {onRefresh && (!availableActions || availableActions.includes("refresh")) ? <button onClick={onRefresh}>Re-score</button> : null}
        {onDismiss && (!availableActions || availableActions.includes("dismiss")) ? <button onClick={onDismiss}>Hide for now</button> : null}
      </div>
      {whyShownSummary ? (
        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
          Cards stay lightweight and reversible so you can continue without committing to heavy structure.
        </p>
      ) : null}
    </article>
  );
}
