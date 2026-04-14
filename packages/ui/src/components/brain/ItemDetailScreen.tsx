import React from "react";

import { BrainItemDetail } from "./BrainItemDetail";
import { CommentComposer } from "../feed/CommentComposer";

type QuickAction = "summarize" | "classify" | "convert_to_task";

export type ContinuityTimelineEntry = {
  id: string;
  label: string;
  timestamp?: string;
};

type ItemDetailScreenProps = {
  item: {
    title: string;
    rawContent: string;
  };
  whyShown?: string;
  lastTouched?: string;
  changedSince?: string;
  nextStep?: string;
  summary?: string;
  classification?: string;
  timeline: ContinuityTimelineEntry[];
  loading?: boolean;
  errorMessage?: string;
  chatPanel?: React.ReactNode;
  artifactHistory?: React.ReactNode;
  onBackToFeed: () => void;
  onQuickAction: (action: QuickAction) => void;
  onAddComment: (comment: string) => void;
  onConvertCommentToTask?: (comment: string) => void;
};

const styles = {
  shell: {
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "24px",
    display: "grid",
    gap: "24px"
  },
  contextPanel: {
    borderRadius: "16px",
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    padding: "16px",
    display: "grid",
    gap: "8px"
  },
  timeline: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "8px"
  }
} satisfies Record<string, React.CSSProperties>;

export function ItemDetailScreen({
  item,
  whyShown,
  lastTouched,
  changedSince,
  nextStep,
  summary,
  classification,
  timeline,
  loading,
  errorMessage,
  chatPanel,
  artifactHistory,
  onBackToFeed,
  onQuickAction,
  onAddComment,
  onConvertCommentToTask
}: ItemDetailScreenProps) {
  return (
    <section style={styles.shell} aria-label="Item detail continuity screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" onClick={onBackToFeed}>
          Back to Focus Feed
        </button>
        <p style={{ margin: 0, color: "#475569" }}>Continue where you left off, then return to the feed.</p>
      </div>

      <div style={styles.contextPanel}>
        <p style={{ margin: 0 }}>
          <strong>What is this?</strong> {item.title}
        </p>
        {whyShown ? (
          <p style={{ margin: 0 }}>
            <strong>Why now?</strong> {whyShown}
          </p>
        ) : null}
        {lastTouched ? (
          <p style={{ margin: 0 }}>
            <strong>Last touched:</strong> {lastTouched}
          </p>
        ) : null}
        {changedSince ? (
          <p style={{ margin: 0 }}>
            <strong>What changed:</strong> {changedSince}
          </p>
        ) : null}
        {nextStep ? (
          <p style={{ margin: 0 }}>
            <strong>Small next step:</strong> {nextStep}
          </p>
        ) : null}
      </div>

      {loading ? <p style={{ margin: 0 }}>Loading continuity context...</p> : null}
      {errorMessage ? <p style={{ margin: 0 }}>{errorMessage}</p> : null}

      <BrainItemDetail
        title={item.title}
        rawContent={item.rawContent}
        summary={summary}
        classification={classification}
        onSummarize={() => onQuickAction("summarize")}
        onClassify={() => onQuickAction("classify")}
      />

      <div>
        <h3 style={{ marginTop: 0 }}>Continuation timeline</h3>
        {timeline.length === 0 ? <p style={{ margin: 0 }}>No continuation notes yet. Add one sentence to preserve context.</p> : null}
        {timeline.length > 0 ? (
          <ul style={styles.timeline}>
            {timeline.map((entry) => (
              <li key={entry.id}>
                {entry.label}
                {entry.timestamp ? <span style={{ color: "#64748b" }}> · {entry.timestamp}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Continue this item</h3>
        <CommentComposer
          onSend={(value) => {
            const normalized = value.trim();
            if (!normalized) return;
            onAddComment(normalized);
          }}
          onConfirmConvertToTask={
            onConvertCommentToTask
              ? (value) => {
                  onConvertCommentToTask(value);
                }
              : undefined
          }
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => onQuickAction("summarize")}>
            Summarize progress
          </button>
          <button type="button" onClick={() => onQuickAction("classify")}>
            Reframe
          </button>
          <button type="button" onClick={() => onQuickAction("convert_to_task")}>
            Plan smallest step
          </button>
        </div>
      </div>

      {chatPanel}
      {artifactHistory}
    </section>
  );
}
