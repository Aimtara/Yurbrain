import React from "react";

import { BrainItemDetail } from "./BrainItemDetail";
import { CommentComposer } from "../feed/CommentComposer";

type QuickAction = "summarize" | "classify" | "convert_to_task";

type RelatedItem = {
  id: string;
  title: string;
  hint?: string;
};

export type ContinuityTimelineEntry = {
  id: string;
  label: string;
  timestamp?: string;
  role?: "user" | "assistant" | "system";
};

type ItemDetailScreenProps = {
  item: {
    title: string;
    rawContent: string;
  };
  whyShown?: string;
  lastTouched?: string;
  whereLeftOff?: string;
  changedSince?: string;
  nextStep?: string;
  executionHint?: string;
  summary?: string;
  classification?: string;
  timeline: ContinuityTimelineEntry[];
  loading?: boolean;
  errorMessage?: string;
  actionNotice?: string;
  chatPanel?: React.ReactNode;
  artifactHistory?: React.ReactNode;
  suggestedPrompts?: string[];
  relatedItems?: RelatedItem[];
  onBackToFeed: () => void;
  onQuickAction: (action: QuickAction) => void;
  onAddComment: (comment: string) => void;
  onAskYurbrain?: (question: string) => void;
  onConvertCommentToTask?: (comment: string) => void;
  onOpenRelatedItem?: (itemId: string) => void;
  onKeepInMind?: () => void;
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
  whereLeftOff,
  changedSince,
  nextStep,
  executionHint,
  summary,
  classification,
  timeline,
  loading,
  errorMessage,
  actionNotice,
  chatPanel,
  artifactHistory,
  suggestedPrompts = [],
  relatedItems = [],
  onBackToFeed,
  onQuickAction,
  onAddComment,
  onAskYurbrain,
  onConvertCommentToTask,
  onOpenRelatedItem,
  onKeepInMind
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
        {whereLeftOff ? (
          <p style={{ margin: 0 }}>
            <strong>Where you left off:</strong> {whereLeftOff}
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
        {executionHint ? (
          <p style={{ margin: 0 }}>
            <strong>Execution status:</strong> {executionHint}
          </p>
        ) : null}
      </div>

      {loading ? <p style={{ margin: 0 }}>Loading continuity context...</p> : null}
      {errorMessage ? <p style={{ margin: 0 }}>{errorMessage}</p> : null}
      {actionNotice ? <p style={{ margin: 0, color: "#1e40af" }}>{actionNotice}</p> : null}

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
        {timeline.length > 0 ? (
          <p style={{ margin: "0 0 8px", color: "#475569", fontSize: "14px", lineHeight: "20px" }}>
            Most recent: {timeline[timeline.length - 1]?.label}
          </p>
        ) : null}
        {timeline.length === 0 ? <p style={{ margin: 0 }}>No continuation notes yet. Add one sentence to preserve context.</p> : null}
        {timeline.length > 0 ? (
          <ul style={styles.timeline}>
            {timeline.map((entry) => (
              <li key={entry.id}>
                {entry.role ? <strong>{roleLabels[entry.role]}: </strong> : null}
                {entry.label}
                {entry.timestamp ? <span style={{ color: "#64748b" }}> · {entry.timestamp}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Continue this item</h3>
        {suggestedPrompts.length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>Suggested prompts</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onAskYurbrain?.(prompt)}
                  style={{ borderRadius: "999px", border: "1px solid #cbd5e1", background: "#f8fafc", padding: "6px 12px" }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <CommentComposer
          onSend={(value) => {
            const normalized = value.trim();
            if (!normalized) return;
            onAddComment(normalized);
          }}
          onAskYurbrain={(value) => {
            if (!onAskYurbrain) return;
            const normalized = value.trim();
            if (!normalized) return;
            onAskYurbrain(normalized);
          }}
          enableAskYurbrain={Boolean(onAskYurbrain)}
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
          <button type="button" onClick={() => onQuickAction("convert_to_task")}>
            Plan this
          </button>
          <button type="button" onClick={() => onQuickAction("classify")}>
            Reframe
          </button>
          <button type="button" onClick={onKeepInMind}>
            Keep in mind
          </button>
          <button type="button" onClick={() => onAddComment("Leaving a quick continuity note.")}>
            Comment
          </button>
          <button type="button" onClick={() => onOpenRelatedItem?.(relatedItems[0]?.id ?? "")} disabled={relatedItems.length === 0}>
            Similar items
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0 }}>Related items</h3>
        {relatedItems.length === 0 ? <p style={{ margin: 0, color: "#475569" }}>No related items yet. Capture and comment history will surface links over time.</p> : null}
        {relatedItems.length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            {relatedItems.map((related) => (
              <button
                key={related.id}
                type="button"
                onClick={() => onOpenRelatedItem?.(related.id)}
                style={{ textAlign: "left", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "10px 12px" }}
              >
                <strong>{related.title}</strong>
                {related.hint ? <span style={{ color: "#475569" }}> — {related.hint}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {chatPanel}
      {artifactHistory}
    </section>
  );
}

const roleLabels: Record<NonNullable<ContinuityTimelineEntry["role"]>, string> = {
  user: "You",
  assistant: "Yurbrain",
  system: "System"
};
