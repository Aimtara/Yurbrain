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
  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>{title}</h2>
      <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>{rawContent}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <button type="button" onClick={onSummarize} disabled={!onSummarize}>
          Summarize
        </button>
        <button type="button" onClick={onClassify} disabled={!onClassify}>
          Classify
        </button>
      </div>
      {summary ? (
        <div aria-label="AI summary" style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#475569" }}>AI summary</p>
          <p style={{ margin: "6px 0 0" }}>{summary}</p>
        </div>
      ) : null}
      {classification ? (
        <div aria-label="AI classification" style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#475569" }}>AI classification</p>
          <p style={{ margin: "6px 0 0" }}>{classification}</p>
        </div>
      ) : null}
    </section>
  );
}
