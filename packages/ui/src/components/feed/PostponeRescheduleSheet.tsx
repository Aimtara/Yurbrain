import React, { useMemo, useState } from "react";

type PostponeRescheduleSheetProps = {
  isOpen: boolean;
  title: string;
  postponeCount?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onLaterToday: () => void;
  onTomorrow: () => void;
  onSuggestSlot: () => void;
  onBreakIntoSmallerStep: () => void;
  onApplyCustomDateTime: (isoDateTime: string) => void;
};

function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function PostponeRescheduleSheet({
  isOpen,
  title,
  postponeCount = 0,
  isSubmitting = false,
  onClose,
  onLaterToday,
  onTomorrow,
  onSuggestSlot,
  onBreakIntoSmallerStep,
  onApplyCustomDateTime
}: PostponeRescheduleSheetProps) {
  const [customDateTime, setCustomDateTime] = useState(() => toLocalDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [customError, setCustomError] = useState("");
  const postponeLabel = useMemo(() => {
    if (postponeCount <= 0) return "First postpone for this card.";
    if (postponeCount === 1) return "Postponed once before.";
    return `Postponed ${postponeCount} times so far.`;
  }, [postponeCount]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Postpone or reschedule"
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
            <h3 style={{ margin: 0, fontSize: "24px", lineHeight: "30px" }}>Postpone without losing context</h3>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting}>
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
            Pick one quick return option after work stalls or a session stays incomplete. Yurbrain keeps the context nearby without turning it into a permanent task list.
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{postponeLabel}</p>
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          <button type="button" onClick={onLaterToday} disabled={isSubmitting}>
            Later today
          </button>
          <button type="button" onClick={onTomorrow} disabled={isSubmitting}>
            Tomorrow
          </button>
          <button type="button" onClick={onSuggestSlot} disabled={isSubmitting}>
            Suggest a slot
          </button>
          <button type="button" onClick={onBreakIntoSmallerStep} disabled={isSubmitting}>
            Break into smaller step
          </button>
        </div>

        <div
          style={{
            borderRadius: "14px",
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            padding: "12px",
            display: "grid",
            gap: "8px"
          }}
        >
          <p style={{ margin: 0, color: "#1e3a8a", fontWeight: 600 }}>Optional specific time</p>
          <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>Use this only if you already know the exact return slot.</p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(event) => {
                setCustomDateTime(event.target.value);
                setCustomError("");
              }}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => {
                const parsed = new Date(customDateTime);
                if (!Number.isFinite(parsed.getTime())) {
                  setCustomError("Please enter a valid date and time.");
                  return;
                }
                if (parsed.getTime() <= Date.now()) {
                  setCustomError("Choose a time in the future.");
                  return;
                }
                onApplyCustomDateTime(parsed.toISOString());
              }}
              disabled={isSubmitting}
            >
              Schedule this slot
            </button>
          </div>
          {customError ? <p style={{ margin: 0, color: "#b91c1c" }}>{customError}</p> : null}
        </div>
      </div>
    </div>
  );
}
