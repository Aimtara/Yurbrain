import React from "react";
import { tokens } from "../../design/tokens";

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
  const whyShownSecondary = typeof whyShown === "string" ? null : whyShown?.reasons?.[1] ?? null;
  const showWhyShownSecondary = Boolean(whyShownSecondary && whyShownSecondary !== whyShownSummary);
  const lensLabel = lens ? lensLabels[lens] : null;
  const cardTypeLabel = cardType ? cardTypeLabels[cardType] : null;
  const timeLabel = formatTimeSignal(lastRefreshedAt ?? undefined, createdAt);

  return (
    <article
      style={{
        border: `1px solid ${feedPalette.border}`,
        borderRadius: `${tokens.radius.md}px`,
        padding: `${tokens.space.md}px`,
        marginBottom: `${tokens.space.sm + tokens.space.xs}px`,
        background: feedPalette.cardBackground,
        boxShadow: "0 1px 2px rgba(12, 17, 29, 0.04)"
      }}
    >
      {cardTypeLabel || lensLabel ? (
        <p style={{ margin: `0 0 ${tokens.space.xs + 2}px`, fontSize: "12px", color: feedPalette.mutedText }}>
          {cardTypeLabel ? <strong>{cardTypeLabel}</strong> : null}
          {cardTypeLabel && lensLabel ? " · " : null}
          {lensLabel ? <span>{lensLabel}</span> : null}
        </p>
      ) : null}
      <h3 style={{ margin: `0 0 ${tokens.space.xs + 2}px`, fontSize: "18px", lineHeight: "1.25" }}>{title}</h3>
      <p style={{ margin: `0 0 ${tokens.space.sm + 2}px`, color: feedPalette.mainText, lineHeight: "1.4" }}>{body}</p>
      {whyShownSummary ? (
        <p style={{ margin: `0 0 ${tokens.space.xs}px`, fontSize: "13px", color: feedPalette.secondaryText }}>
          <strong>Why shown:</strong> {whyShownSummary}
        </p>
      ) : null}
      {showWhyShownSecondary ? (
        <p style={{ margin: `0 0 ${tokens.space.sm + 2}px`, fontSize: "12px", color: feedPalette.mutedText }}>{whyShownSecondary}</p>
      ) : null}
      {timeLabel ? (
        <p style={{ margin: `0 0 ${tokens.space.sm + 2}px`, color: feedPalette.mutedText }}>
          <small>{timeLabel}</small>
        </p>
      ) : null}
      <div style={{ display: "flex", gap: `${tokens.space.sm}px`, flexWrap: "wrap" }} role="group" aria-label="Card actions">
        {onComment ? (
          <button style={actionButtonStyles.secondary} onClick={() => onComment("Noted for follow-up.")}>
            Add Update
          </button>
        ) : null}
        {onContinue ? (
          <button style={actionButtonStyles.primary} onClick={onContinue}>
            Continue
          </button>
        ) : null}
        {onConvertToTask ? (
          <button style={actionButtonStyles.primary} onClick={onConvertToTask}>
            Plan This
          </button>
        ) : null}
        {onStartSession ? (
          <button style={actionButtonStyles.primary} onClick={onStartSession}>
            Start Session
          </button>
        ) : null}
        {onSnooze ? (
          <button style={actionButtonStyles.secondary} onClick={() => onSnooze(120)}>
            Revisit Later
          </button>
        ) : null}
        {onRefresh ? (
          <button style={actionButtonStyles.secondary} onClick={onRefresh}>
            Keep in Focus
          </button>
        ) : null}
        {onDismiss ? (
          <button style={actionButtonStyles.tertiary} onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
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

const feedPalette = {
  border: "#d9d9df",
  cardBackground: "#ffffff",
  mainText: "#1d2130",
  secondaryText: "#3e4458",
  mutedText: "#5a6072"
};

const actionButtonStyles: Record<"primary" | "secondary" | "tertiary", React.CSSProperties> = {
  primary: {
    border: "1px solid #bfc7dd",
    background: "#f6f8ff",
    borderRadius: "999px",
    padding: "6px 12px",
    fontWeight: 600
  },
  secondary: {
    border: "1px solid #d0d5e3",
    background: "#ffffff",
    borderRadius: "999px",
    padding: "6px 12px"
  },
  tertiary: {
    border: "1px solid #d9d9df",
    background: "#ffffff",
    color: "#4d5368",
    borderRadius: "999px",
    padding: "6px 12px"
  }
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
