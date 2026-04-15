import React, { useId } from "react";
import { tokens } from "../../design/tokens";

export type FeedCardVariant = "default" | "execution" | "blocked" | "done" | "resume";
export type FeedCardAction = "open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh";
type FeedCardType = "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";

export function FeedCard({
  variant = "default",
  badge,
  cardType,
  lens,
  title,
  body,
  createdAt,
  lastRefreshedAt,
  whyShown,
  lastTouched,
  continuityNote,
  nextStep,
  whereLeftOff,
  availableActions,
  primaryActionLabel,
  onOpen,
  onContinue,
  onComment,
  onConvertToTask,
  onStartSession,
  onDismiss,
  onSnooze,
  onRefresh
}: {
  variant?: FeedCardVariant;
  badge?: string;
  cardType?: FeedCardType | string;
  lens?: FeedLens;
  title: string;
  body: string;
  createdAt?: string;
  lastRefreshedAt?: string | null;
  whyShown?: { summary: string; reasons: string[] } | string;
  lastTouched?: string;
  continuityNote?: string;
  nextStep?: string;
  whereLeftOff?: string;
  availableActions?: FeedCardAction[];
  primaryActionLabel?: string;
  onOpen?: () => void;
  onContinue?: () => void;
  onComment?: (value: string) => void;
  onConvertToTask?: () => void;
  onStartSession?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  const idBase = useId();
  const titleId = `${idBase}-title`;
  const whyShownId = `${idBase}-why`;
  const whyShownSecondaryId = `${idBase}-why-secondary`;
  const continuityId = `${idBase}-continuity`;
  const timeId = `${idBase}-time`;

  const whyShownSummary = typeof whyShown === "string" ? whyShown : whyShown?.summary;
  const whyShownReasons = typeof whyShown === "string" ? [] : whyShown?.reasons ?? [];
  const whyShownSecondary = whyShownReasons[0] ?? null;
  const showWhyShownSecondary = Boolean(whyShownSecondary && whyShownSecondary !== whyShownSummary);
  const timeLabel = lastTouched ?? formatTimeSignal(lastRefreshedAt ?? undefined, createdAt);
  const cardTypeLabel = cardType ? normalizeCardTypeLabel(cardType) : null;
  const lensLabel = lens ? lensLabels[lens] : null;
  const hasContinuityDetails = Boolean(lastTouched || whereLeftOff || continuityNote || nextStep);
  const canUseAction = (action: FeedCardAction) => !availableActions || availableActions.includes(action);
  const describedByIds = [
    whyShownSummary ? whyShownId : "",
    showWhyShownSecondary ? whyShownSecondaryId : "",
    hasContinuityDetails ? continuityId : "",
    timeLabel ? timeId : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={describedByIds || undefined}
      style={{
        borderRadius: `${tokens.radius.lg}px`,
        border: `1px solid ${variantStyles[variant].border}`,
        background: variantStyles[variant].background,
        padding: `${tokens.space.md + 4}px`,
        display: "grid",
        gap: `${tokens.space.sm}px`
      }}
    >
      <div style={{ display: "flex", gap: `${tokens.space.xs + 2}px`, flexWrap: "wrap" }}>
        {badge ? <span style={chipStyles.default}>{badge}</span> : null}
        {cardTypeLabel ? <span style={{ ...chipStyles.default, color: "#475569" }}>{cardTypeLabel}</span> : null}
        {lensLabel ? <span style={chipStyles.default}>{lensLabel}</span> : null}
      </div>

      <div>
        <h3 id={titleId} style={{ margin: 0, fontSize: "20px", lineHeight: "26px", color: "#0f172a" }}>
          {title}
        </h3>
        <p style={{ margin: `${tokens.space.xs + 2}px 0 0`, color: "#334155", lineHeight: "1.45" }}>{body}</p>
      </div>

      {whyShownSummary ? (
        <div style={{ borderRadius: `${tokens.radius.md}px`, background: "#f8fafc", border: "1px solid #e2e8f0", padding: `${tokens.space.sm}px` }}>
          <p id={whyShownId} style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            Why shown
          </p>
          <p style={{ margin: `${tokens.space.xs + 2}px 0 0`, color: "#1e293b" }}>{whyShownSummary}</p>
          {showWhyShownSecondary ? (
            <p id={whyShownSecondaryId} style={{ margin: `${tokens.space.xs + 2}px 0 0`, color: "#475569", fontSize: "13px" }}>
              {whyShownSecondary}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasContinuityDetails ? (
        <div id={continuityId} style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "14px" }}>
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
          {continuityNote ? (
            <p style={{ margin: 0 }}>
              <strong>Since then:</strong> {continuityNote}
            </p>
          ) : null}
          {nextStep ? (
            <p style={{ margin: 0 }}>
              <strong>Next move:</strong> {nextStep}
            </p>
          ) : null}
        </div>
      ) : null}

      {timeLabel ? (
        <p id={timeId} style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
          {timeLabel}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: `${tokens.space.xs + 2}px` }} role="group" aria-label={`Actions for ${title}`}>
        {onOpen && (canUseAction("open_item") || canUseAction("open_task") || canUseAction("start_session")) ? (
          <button type="button" onClick={onOpen} style={actionButtonStyles.primary} aria-label={`${primaryActionLabel ?? "Open continuity"} for ${title}`}>
            {primaryActionLabel ?? "Open continuity"}
          </button>
        ) : null}
        {onContinue && canUseAction("open_item") ? (
          <button type="button" onClick={onContinue} style={actionButtonStyles.primary} aria-label={`Continue from ${title}`}>
            Continue
          </button>
        ) : null}
        {onComment && canUseAction("comment") ? (
          <button type="button" onClick={() => onComment("Noted for follow-up.")} style={actionButtonStyles.secondary} aria-label={`Add update to ${title}`}>
            Add update
          </button>
        ) : null}
        {onConvertToTask && canUseAction("convert_to_task") ? (
          <button type="button" onClick={onConvertToTask} style={actionButtonStyles.primary} aria-label={`Plan next step for ${title}`}>
            Plan this
          </button>
        ) : null}
        {onStartSession && canUseAction("start_session") ? (
          <button type="button" onClick={onStartSession} style={actionButtonStyles.primary} aria-label={`Start session for ${title}`}>
            Start session
          </button>
        ) : null}
        {onSnooze && canUseAction("snooze") ? (
          <button type="button" onClick={() => onSnooze(120)} style={actionButtonStyles.secondary} aria-label={`Snooze ${title} for two hours`}>
            Revisit later
          </button>
        ) : null}
        {onRefresh && canUseAction("refresh") ? (
          <button type="button" onClick={onRefresh} style={actionButtonStyles.secondary} aria-label={`Re-score ${title}`}>
            Keep in focus
          </button>
        ) : null}
        {onDismiss && canUseAction("dismiss") ? (
          <button type="button" onClick={onDismiss} style={actionButtonStyles.tertiary} aria-label={`Dismiss ${title}`}>
            Dismiss
          </button>
        ) : null}
      </div>
    </article>
  );
}

const variantStyles: Record<FeedCardVariant, { border: string; background: string }> = {
  default: { border: "#e2e8f0", background: "#ffffff" },
  execution: { border: "#c7d2fe", background: "#eef2ff" },
  blocked: { border: "#fcd34d", background: "#fffbeb" },
  done: { border: "#99f6e4", background: "#f0fdfa" },
  resume: { border: "#bfdbfe", background: "#eff6ff" }
};

const chipStyles: Record<"default", React.CSSProperties> = {
  default: {
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700
  }
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

const lensLabels: Record<FeedLens, string> = {
  all: "All focus",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recent comments"
};

const cardTypeLabels: Record<FeedCardType, string> = {
  item: "Memory",
  digest: "Digest",
  cluster: "Cluster",
  opportunity: "Opportunity",
  open_loop: "Open loop",
  resume: "Resume point"
};

function normalizeCardTypeLabel(cardType: string): string {
  if (cardType in cardTypeLabels) {
    return cardTypeLabels[cardType as FeedCardType];
  }
  return cardType.replaceAll("_", " ");
}

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
