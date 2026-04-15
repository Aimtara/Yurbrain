import React from "react";

type FounderSummaryStat = {
  label: string;
  value: string;
};

type SuggestedFocus = {
  title: string;
  reason: string;
  nextStep: string;
  onOpen: () => void;
};

type BlockedContinuity = {
  id: string;
  title: string;
  reason: string;
  nextMove: string;
  onOpen: () => void;
};

type FounderSummarySurfaceProps = {
  stats: FounderSummaryStat[];
  suggestedFocus: SuggestedFocus | null;
  blockedItems?: BlockedContinuity[];
  summary: string;
};

export function FounderSummarySurface({ stats, suggestedFocus, blockedItems = [], summary }: FounderSummarySurfaceProps) {
  return (
    <section aria-label="Founder summary surface" style={{ display: "grid", gap: "16px" }}>
      <header>
        <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Founder summary</h2>
        <p style={{ margin: "6px 0 0", color: "#475569" }}>Execution lens across your current continuity feed.</p>
      </header>
      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        {stats.slice(0, 3).map((stat) => (
          <article key={stat.label} style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px", background: "#ffffff" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{stat.label}</p>
            <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700 }}>{stat.value}</p>
          </article>
        ))}
      </div>
      {suggestedFocus ? (
        <article style={{ borderRadius: "20px", border: "1px solid #dbeafe", background: "#eff6ff", padding: "16px", display: "grid", gap: "8px" }}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700, color: "#475569" }}>
            Suggested next focus
          </p>
          <h3 style={{ margin: 0 }}>{suggestedFocus.title}</h3>
          <p style={{ margin: 0 }}>{suggestedFocus.reason}</p>
          <p style={{ margin: 0, color: "#334155" }}>
            <strong>Small next step:</strong> {suggestedFocus.nextStep}
          </p>
          <div>
            <button type="button" onClick={suggestedFocus.onOpen}>
              Open in continuity
            </button>
          </div>
        </article>
      ) : null}
      {blockedItems.length > 0 ? (
        <article style={{ borderRadius: "20px", border: "1px solid #fde68a", background: "#fffbeb", padding: "16px", display: "grid", gap: "10px" }}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700, color: "#92400e" }}>
            Blocked and worth revisiting
          </p>
          <div style={{ display: "grid", gap: "8px" }}>
            {blockedItems.slice(0, 2).map((blocked) => (
              <div key={blocked.id} style={{ borderRadius: "14px", border: "1px solid #fcd34d", background: "#ffffff", padding: "10px", display: "grid", gap: "6px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{blocked.title}</p>
                <p style={{ margin: 0, color: "#92400e" }}>
                  <strong>Blocked:</strong> {blocked.reason}
                </p>
                <p style={{ margin: 0, color: "#78350f" }}>
                  <strong>Next move:</strong> {blocked.nextMove}
                </p>
                <div>
                  <button type="button" onClick={blocked.onOpen}>
                    Revisit item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
      <article style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "16px", display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", lineHeight: "22px" }}>AI founder summary</h3>
        <p style={{ margin: 0, color: "#334155", fontSize: "15px", lineHeight: "22px" }}>{summary}</p>
      </article>
    </section>
  );
}
