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
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  const whyShownSummary = typeof whyShown === "string" ? whyShown : whyShown?.summary;
  const lensLabel = lens ? lensLabels[lens] : null;
  const cardTypeLabel = cardType ? cardTypeLabels[cardType] : null;
  const timeLabel = formatTimeSignal(lastRefreshedAt ?? undefined, createdAt);

  return (
    <article>
      {cardTypeLabel || lensLabel ? (
        <p>
          {cardTypeLabel ? <strong>{cardTypeLabel}</strong> : null}
          {cardTypeLabel && lensLabel ? " · " : null}
          {lensLabel ? <span>{lensLabel}</span> : null}
        </p>
      ) : null}
      <h3>{title}</h3>
      <p>{body}</p>
      {whyShownSummary ? (
        <p>
          <strong>Why shown:</strong> {whyShownSummary}
        </p>
      ) : null}
      {timeLabel ? (
        <p>
          <small>{timeLabel}</small>
        </p>
      ) : null}
      {onComment ? <button onClick={() => onComment("Noted for follow-up.")}>Add update</button> : null}
      {onContinue ? <button onClick={onContinue}>Continue</button> : null}
      {onConvertToTask ? <button onClick={onConvertToTask}>Plan this</button> : null}
      {onSnooze ? <button onClick={() => onSnooze(120)}>Revisit later</button> : null}
      {onRefresh ? <button onClick={onRefresh}>Keep in focus</button> : null}
      {onDismiss ? <button onClick={onDismiss}>Dismiss</button> : null}
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
