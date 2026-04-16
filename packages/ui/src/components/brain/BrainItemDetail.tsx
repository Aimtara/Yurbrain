import React from "react";

type BrainItemDetailProps = {
  title: string;
  rawContent: string;
  summary?: string;
  classification?: string;
  onSummarize?: () => void;
  onClassify?: () => void;
};

export function BrainItemDetail({
  title,
  rawContent,
  summary,
  classification,
  onSummarize,
  onClassify
}: BrainItemDetailProps) {
  const showAiActions = Boolean(onSummarize || onClassify);
  const showAiSupport = Boolean(summary || classification);

  return (
    <section style={{ display: "grid", gap: "14px" }}>
      <div style={{ borderRadius: "16px", border: "1px solid #dbeafe", background: "#f8fbff", padding: "14px" }}>
        <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.03em", textTransform: "uppercase", color: "#475569", fontWeight: 700 }}>
          Captured thought
        </p>
        <h2 style={{ margin: "6px 0 0", fontSize: "22px", lineHeight: "28px" }}>{title}</h2>
        <p style={{ margin: "8px 0 0", color: "#334155", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{rawContent}</p>
      </div>

      {showAiActions ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" onClick={onSummarize} disabled={!onSummarize}>
            Summarize
          </button>
          <button type="button" onClick={onClassify} disabled={!onClassify}>
            Classify
          </button>
        </div>
      ) : null}

      {showAiSupport ? (
        <div aria-label="AI continuity support" style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px", display: "grid", gap: "10px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#475569" }}>AI continuity support</p>
          {summary ? (
            <div aria-label="AI summary">
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>Latest summary</p>
              <p style={{ margin: "4px 0 0" }}>{summary}</p>
            </div>
          ) : null}
          {classification ? (
            <div aria-label="AI classification">
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>Latest framing</p>
              <p style={{ margin: "4px 0 0" }}>{classification}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
