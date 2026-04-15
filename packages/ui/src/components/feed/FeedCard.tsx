import React from "react";

export function FeedCard({
  title,
  body,
  cardType,
  lens,
  createdAt,
  lastRefreshedAt,
  whyShown,
  onContinue,
  onComment,
  onConvertToTask,
  onStartSession,
  onDismiss,
  onSnooze,
  onRefresh
}: {
  title: string;
  body: string;
  cardType?: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens?: "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
  createdAt?: string;
  lastRefreshedAt?: string | null;
  whyShown?: { summary: string; reasons: string[] } | string;
  onContinue?: () => void;
  onComment?: (value: string) => void;
  onConvertToTask?: () => void;
  onStartSession?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  const whyShownSummary = typeof whyShown === "string" ? whyShown : whyShown?.summary;
  const lensLabel = lens ? lensLabels[lens] : null;
  const cardTypeLabel = cardType ? cardTypeLabels[cardType] : null;
  const timeLabel = formatTimeSignal(lastRefreshedAt ?? undefined, createdAt);

  return (
    <article
      style={{
        border: "1px solid #d9d9df",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "12px",
        background: "#fff"
      }}
    >
      {cardTypeLabel || lensLabel ? (
        <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#5a6072" }}>
          {cardTypeLabel ? <strong>{cardTypeLabel}</strong> : null}
          {cardTypeLabel && lensLabel ? " · " : null}
          {lensLabel ? <span>{lensLabel}</span> : null}
        </p>
      ) : null}
      <h3 style={{ margin: "0 0 6px", fontSize: "18px", lineHeight: "1.25" }}>{title}</h3>
      <p style={{ margin: "0 0 10px", color: "#222", lineHeight: "1.4" }}>{body}</p>
      {whyShownSummary ? (
        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#40455a" }}>
          <strong>Why shown:</strong> {whyShownSummary}
        </p>
      ) : null}
      {timeLabel ? (
        <p style={{ margin: "0 0 10px" }}>
          <small>{timeLabel}</small>
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {onComment ? <button onClick={() => onComment("Noted for follow-up.")}>Add update</button> : null}
        {onContinue ? <button onClick={onContinue}>Continue</button> : null}
        {onConvertToTask ? <button onClick={onConvertToTask}>Plan this</button> : null}
        {onStartSession ? <button onClick={onStartSession}>Start session</button> : null}
        {onSnooze ? <button onClick={() => onSnooze(120)}>Revisit later</button> : null}
        {onRefresh ? <button onClick={onRefresh}>Keep in focus</button> : null}
        {onDismiss ? <button onClick={onDismiss}>Dismiss</button> : null}
      </div>
    </article>
  );
}

const lensLabels: Record<NonNullable<Parameters<typeof FeedCard>[0]["lens"]>, string> = {
  all: "All focus",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recent comments"
};

const cardTypeLabels: Record<NonNullable<Parameters<typeof FeedCard>[0]["cardType"]>, string> = {
  item: "Memory",
  digest: "Digest",
  cluster: "Cluster",
  opportunity: "Opportunity",
  open_loop: "Open loop",
  resume: "Resume point"
};

function formatTimeSignal(lastRefreshedAt?: string, createdAt?: string): string | null {
  if (lastRefreshedAt) {
    const relative = formatRelativeTime(lastRefreshedAt);
    return relative ? `Last touched ${relative}` : "Recently touched";
  }
  if (createdAt) {
    const relative = formatRelativeTime(createdAt);
    return relative ? `Saved ${relative}` : "Saved recently";
  }
  return null;
}

function formatRelativeTime(isoTimestamp: string): string | null {
  const timestamp = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "just now";
  const diffHours = diffMs / 3_600_000;
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}
