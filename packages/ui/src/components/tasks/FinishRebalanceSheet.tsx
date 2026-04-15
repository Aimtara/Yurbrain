import React from "react";

type FinishRebalanceSheetProps = {
  isOpen: boolean;
  taskTitle: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  suggestion: string;
  isApplying?: boolean;
  onClose: () => void;
  onContinuePlan: () => void;
  onRebalanceDay: () => void;
  onTakeBreak: () => void;
  onScheduleRestLater: () => void;
};

function buildDeltaLabel(deltaMinutes: number): string {
  if (deltaMinutes > 0) return `Overflow: ${deltaMinutes}m over your plan`;
  if (deltaMinutes < 0) return `Reclaimed: ${Math.abs(deltaMinutes)}m back in your day`;
  return "On plan: your estimate matched this session";
}

export function FinishRebalanceSheet({
  isOpen,
  taskTitle,
  plannedMinutes,
  actualMinutes,
  deltaMinutes,
  suggestion,
  isApplying = false,
  onClose,
  onContinuePlan,
  onRebalanceDay,
  onTakeBreak,
  onScheduleRestLater
}: FinishRebalanceSheetProps) {
  if (!isOpen) return null;

  const overflow = deltaMinutes > 0;
  const header = overflow ? "That took a bit longer. Let's adjust." : "Nice work. You closed a focus loop.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finish and rebalance"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          maxHeight: "84vh",
          overflowY: "auto",
          borderRadius: "24px",
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          padding: "20px",
          display: "grid",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "24px", lineHeight: "30px" }}>{header}</h3>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{taskTitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isApplying}>
            Close
          </button>
        </div>

        <div
          style={{
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "12px",
            display: "grid",
            gap: "6px"
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Planned:</strong> {plannedMinutes}m
          </p>
          <p style={{ margin: 0 }}>
            <strong>Actual:</strong> {actualMinutes}m
          </p>
          <p style={{ margin: 0, color: overflow ? "#92400e" : "#0f766e" }}>{buildDeltaLabel(deltaMinutes)}</p>
        </div>

        <div
          style={{
            borderRadius: "14px",
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            padding: "12px"
          }}
        >
          <p style={{ margin: 0, color: "#1e3a8a" }}>{suggestion}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" onClick={onContinuePlan} disabled={isApplying}>
            Continue plan
          </button>
          <button type="button" onClick={onRebalanceDay} disabled={isApplying}>
            Rebalance day
          </button>
          <button type="button" onClick={onTakeBreak} disabled={isApplying}>
            Take a break
          </button>
          <button type="button" onClick={onScheduleRestLater} disabled={isApplying}>
            Schedule rest later
          </button>
        </div>
      </div>
    </div>
  );
}
