import React from "react";

export type PlanPreviewStep = {
  id: string;
  title: string;
  minutes: number;
};

type PlanPreviewSheetProps = {
  isOpen: boolean;
  title: string;
  steps: PlanPreviewStep[];
  capacityLimitMinutes?: number;
  isSubmitting?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onUpdateStepMinutes: (stepId: string, minutes: number) => void;
  onAcceptPlan: () => void;
  onStartFirstStep: () => void;
};

export function PlanPreviewSheet({
  isOpen,
  title,
  steps,
  capacityLimitMinutes,
  isSubmitting = false,
  errorMessage,
  onClose,
  onUpdateStepMinutes,
  onAcceptPlan,
  onStartFirstStep
}: PlanPreviewSheetProps) {
  if (!isOpen) return null;

  const totalMinutes = steps.reduce((sum, step) => sum + Math.max(5, Math.trunc(step.minutes)), 0);
  const exceedsCapacity = typeof capacityLimitMinutes === "number" && totalMinutes > capacityLimitMinutes;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
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
          maxHeight: "80vh",
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
            <h3 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Proposed plan</h3>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
        </div>

        <div style={{ borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
          <p style={{ margin: 0 }}>
            <strong>Total estimate:</strong> {totalMinutes} minutes
            {typeof capacityLimitMinutes === "number" ? ` (window: ${capacityLimitMinutes} minutes)` : ""}
          </p>
          {exceedsCapacity ? (
            <p style={{ margin: "8px 0 0", color: "#92400e" }}>
              This is slightly above your current focus window. You can still continue and rebalance later.
            </p>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: "12px",
                display: "grid",
                gap: "8px"
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>
                  {index + 1}. {step.title}
                </strong>
              </p>
              <label style={{ display: "flex", gap: "8px", alignItems: "center", color: "#475569" }}>
                Duration (minutes)
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={step.minutes}
                  onChange={(event) => {
                    const nextMinutes = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(nextMinutes)) return;
                    onUpdateStepMinutes(step.id, nextMinutes);
                  }}
                  disabled={isSubmitting}
                  style={{ width: "90px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "4px 8px" }}
                />
              </label>
            </div>
          ))}
        </div>

        {errorMessage ? <p style={{ margin: 0, color: "#b91c1c" }}>{errorMessage}</p> : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" onClick={onAcceptPlan} disabled={isSubmitting || steps.length === 0}>
            Accept plan
          </button>
          <button type="button" onClick={onStartFirstStep} disabled={isSubmitting || steps.length === 0}>
            Start first step
          </button>
        </div>
      </div>
    </div>
  );
}
