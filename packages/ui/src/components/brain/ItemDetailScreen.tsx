import React from "react";

import { BrainItemDetail } from "./BrainItemDetail";
import { CommentComposer, type CommentComposerMode } from "../feed/CommentComposer";

type QuickAction = "summarize_progress" | "next_step" | "convert_to_task" | "classify";

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
  blockedState?: string;
  nextStep?: string;
  executionHint?: string;
  summary?: string;
  classification?: string;
  timeline: ContinuityTimelineEntry[];
  loading?: boolean;
  errorMessage?: string;
  actionNotice?: string;
  artifactHistory?: React.ReactNode;
  suggestedPrompts?: string[];
  relatedItems?: RelatedItem[];
  onBackToFeed: () => void;
  onQuickAction: (action: QuickAction) => void;
  onAddComment: (comment: string) => void;
  onAskYurbrain?: (question: string) => void;
  onConvertCommentToTask?: (comment: string) => void;
  onOpenRelatedItem?: (itemId: string) => void;
  onExploreWithRelated?: () => void;
  onStartSession?: () => void;
  canStartSession?: boolean;
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
  reentryGrid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)"
  },
  contextPanel: {
    borderRadius: "16px",
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    padding: "16px",
    display: "grid",
    gap: "10px",
    alignContent: "start"
  },
  actionsPanel: {
    borderRadius: "16px",
    border: "1px solid #d1fae5",
    background: "#f0fdf4",
    padding: "14px",
    display: "grid",
    gap: "10px"
  },
  actionRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  primaryAction: {
    borderRadius: "999px",
    border: "1px solid #bfdbfe",
    background: "#dbeafe",
    color: "#0f172a",
    padding: "7px 12px",
    fontWeight: 600
  },
  secondaryAction: {
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "7px 12px"
  },
  timelineSection: {
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "14px",
    display: "grid",
    gap: "10px"
  },
  timelineTrack: {
    display: "grid",
    gap: "10px",
    paddingLeft: "14px",
    borderLeft: "2px solid #dbeafe"
  },
  timelineEntry: {
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "10px 12px"
  },
  timelineMeta: {
    margin: 0,
    fontSize: "12px",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em"
  },
  relatedRibbon: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  relatedChip: {
    textAlign: "left",
    borderRadius: "999px",
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    padding: "7px 12px",
    maxWidth: "100%"
  },
  aiSupport: {
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "14px",
    display: "grid",
    gap: "10px"
  },
} satisfies Record<string, React.CSSProperties>;

export function ItemDetailScreen({
  item,
  whyShown,
  lastTouched,
  whereLeftOff,
  changedSince,
  blockedState,
  nextStep,
  executionHint,
  summary,
  classification,
  timeline,
  loading,
  errorMessage,
  actionNotice,
  artifactHistory,
  suggestedPrompts = [],
  relatedItems = [],
  onBackToFeed,
  onQuickAction,
  onAddComment,
  onAskYurbrain,
  onConvertCommentToTask,
  onOpenRelatedItem,
  onExploreWithRelated,
  onStartSession,
  canStartSession = false
}: ItemDetailScreenProps) {
  const [preferredComposerMode, setPreferredComposerMode] = React.useState<CommentComposerMode>("comment");
  const [composerFocusSignal, setComposerFocusSignal] = React.useState(0);
  const [showAllRelated, setShowAllRelated] = React.useState(false);

  const timelineInReverse = React.useMemo(() => [...timeline].reverse(), [timeline]);
  const latestTimelineEntry = timelineInReverse[0];
  const relatedItemsToShow = showAllRelated ? relatedItems : relatedItems.slice(0, 3);
  const canShowMoreRelated = relatedItems.length > 3;

  const focusComposer = (mode: CommentComposerMode) => {
    setPreferredComposerMode(mode);
    setComposerFocusSignal((current) => current + 1);
  };

  React.useEffect(() => {
    setShowAllRelated(false);
  }, [item.title, relatedItems.length]);

  return (
    <section style={styles.shell} aria-label="Item detail continuity screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" onClick={onBackToFeed}>
          Back to Focus Feed
        </button>
        <p style={{ margin: 0, color: "#475569" }}>Restore context fast, continue one step, then return to the feed.</p>
      </div>

      <div style={styles.reentryGrid}>
        <BrainItemDetail title={item.title} rawContent={item.rawContent} />

        <div style={styles.contextPanel}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.03em", textTransform: "uppercase", color: "#1d4ed8", fontWeight: 700 }}>Resume packet</p>
          {whyShown ? (
            <p style={{ margin: 0 }}>
              <strong>Why it matters:</strong> {whyShown}
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
          {nextStep ? (
            <p style={{ margin: 0 }}>
              <strong>Best next move:</strong> {nextStep}
            </p>
          ) : null}
          {(changedSince || blockedState || executionHint) && (
            <div style={{ borderTop: "1px solid #dbeafe", paddingTop: "8px", display: "grid", gap: "6px", fontSize: "13px", color: "#475569" }}>
              {changedSince ? (
                <p style={{ margin: 0 }}>
                  <strong>What changed:</strong> {changedSince}
                </p>
              ) : null}
              {blockedState ? (
                <p style={{ margin: 0 }}>
                  <strong>Current blocker:</strong> {blockedState}
                </p>
              ) : null}
              {executionHint ? (
                <p style={{ margin: 0 }}>
                  <strong>Execution:</strong> {executionHint}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {loading ? <p style={{ margin: 0 }}>Loading continuity context...</p> : null}
      {errorMessage ? <p style={{ margin: 0 }}>{errorMessage}</p> : null}
      {actionNotice ? <p style={{ margin: 0, color: "#1e40af" }}>{actionNotice}</p> : null}

      <div style={styles.actionsPanel}>
        <h3 style={{ margin: 0 }}>Continue from here</h3>
        {nextStep ? <p style={{ margin: 0, color: "#166534" }}>Suggested next move: {nextStep}</p> : null}
        <div style={styles.actionRow}>
          <button type="button" onClick={() => focusComposer("comment")} style={styles.primaryAction}>
            Add Update
          </button>
          <button type="button" onClick={() => onQuickAction("convert_to_task")} style={styles.primaryAction}>
            Plan This
          </button>
          <button
            type="button"
            onClick={onStartSession}
            disabled={!canStartSession || !onStartSession}
            style={{
              ...styles.primaryAction,
              opacity: canStartSession && onStartSession ? 1 : 0.55,
              cursor: canStartSession && onStartSession ? "pointer" : "not-allowed"
            }}
          >
            Start Session
          </button>
          <button
            type="button"
            onClick={() => {
              onQuickAction("summarize_progress");
            }}
            style={styles.secondaryAction}
          >
            Summarize Progress
          </button>
          <button
            type="button"
            onClick={() => onQuickAction("next_step")}
            style={styles.secondaryAction}
          >
            What Should I Do Next?
          </button>
          <button type="button" onClick={() => setShowAllRelated(true)} style={styles.secondaryAction}>
            Show related items
          </button>
          {onExploreWithRelated ? (
            <button type="button" onClick={onExploreWithRelated} style={styles.secondaryAction}>
              Explore with related
            </button>
          ) : null}
        </div>
        {!canStartSession ? (
          <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>Start Session appears after this item is planned into a task.</p>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0 }}>Add to the continuity thread</h3>
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
          preferredMode={preferredComposerMode}
          focusSignal={composerFocusSignal}
          onConfirmConvertToTask={
            onConvertCommentToTask
              ? (value) => {
                  onConvertCommentToTask(value);
                }
              : undefined
          }
        />
      </div>

      <div style={styles.timelineSection}>
        <h3 style={{ margin: 0 }}>Thinking timeline</h3>
        {latestTimelineEntry ? (
          <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
            Latest checkpoint: {latestTimelineEntry.label}
          </p>
        ) : (
          <p style={{ margin: 0 }}>No continuity entries yet. Add a quick update to preserve your next re-entry.</p>
        )}
        {timelineInReverse.length > 1 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Newest first. Scroll down for earlier thinking.</p>
        ) : null}
        {timelineInReverse.length > 0 ? (
          <div style={styles.timelineTrack}>
            {timelineInReverse.map((entry) => (
              <article
                key={entry.id}
                style={{
                  ...styles.timelineEntry,
                  borderLeft: `3px solid ${entry.role === "assistant" ? "#c7d2fe" : entry.role === "system" ? "#fde68a" : "#bae6fd"}`
                }}
              >
                <p style={styles.timelineMeta}>
                  {entry.role ? roleLabels[entry.role] : "Continuity note"}
                  {entry.timestamp ? ` · ${entry.timestamp}` : ""}
                </p>
                <p style={{ margin: "6px 0 0", color: "#0f172a", whiteSpace: "pre-wrap" }}>{entry.label}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <div style={styles.aiSupport}>
        <h3 style={{ margin: 0 }}>AI support (optional)</h3>
        {summary ? (
          <p style={{ margin: 0 }}>
            <strong>Latest summary:</strong> {summary}
          </p>
        ) : null}
        {classification ? (
          <p style={{ margin: 0 }}>
            <strong>Latest framing:</strong> {classification}
          </p>
        ) : null}
        {suggestedPrompts.length > 0 ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onAskYurbrain?.(prompt)}
                style={{ borderRadius: "999px", border: "1px solid #cbd5e1", background: "#ffffff", padding: "6px 12px" }}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0 }}>Related continuity</h3>
        {relatedItems.length === 0 ? <p style={{ margin: 0, color: "#475569" }}>No related items yet. Capture and update history will connect nearby thoughts over time.</p> : null}
        {relatedItems.length > 0 ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={styles.relatedRibbon}>
              {relatedItemsToShow.map((related) => (
                <button
                  key={related.id}
                  type="button"
                  onClick={() => onOpenRelatedItem?.(related.id)}
                  style={styles.relatedChip}
                  title={related.hint}
                >
                  <strong>{related.title}</strong>
                  {related.hint ? <span style={{ color: "#475569" }}> · {related.hint}</span> : null}
                </button>
              ))}
            </div>
            {canShowMoreRelated ? (
              <button
                type="button"
                onClick={() => setShowAllRelated((current) => !current)}
                style={{ ...styles.secondaryAction, justifySelf: "start" }}
              >
                {showAllRelated ? "Show fewer" : `Show more (${relatedItems.length - relatedItemsToShow.length})`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {artifactHistory}
    </section>
  );
}

const roleLabels: Record<NonNullable<ContinuityTimelineEntry["role"]>, string> = {
  user: "Thinking update",
  assistant: "AI support",
  system: "System signal"
};
