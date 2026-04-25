import React, { useId } from "react";

import { tokens } from "../../design/tokens";

type ClusterCardAction = "see_highlights" | "compare" | "try_one_today" | "explore" | "dismiss";

type ClusterCardProps = {
  title: string;
  description: string;
  whyShown: string;
  topicLabel: string;
  itemCount: number;
  lastTouched?: string;
  onSeeHighlights?: () => void;
  onCompare?: () => void;
  onTryOneToday?: () => void;
  onExplore?: () => void;
  onDismiss?: () => void;
  availableActions?: ClusterCardAction[];
};

export function ClusterCard({
  title,
  description,
  whyShown,
  topicLabel,
  itemCount,
  lastTouched,
  onSeeHighlights,
  onCompare,
  onTryOneToday,
  onExplore,
  onDismiss,
  availableActions
}: ClusterCardProps) {
  const idBase = useId();
  const titleId = `${idBase}-title`;
  const whyId = `${idBase}-why`;
  const countId = `${idBase}-count`;
  const canUse = (action: ClusterCardAction) => !availableActions || availableActions.includes(action);

  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={`${whyId} ${countId}`}
      style={{
        borderRadius: `${tokens.radius.lg}px`,
        border: "1px solid #c4b5fd",
        background: "linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)",
        padding: `${tokens.space.md + 4}px`,
        display: "grid",
        gap: `${tokens.space.sm}px`
      }}
    >
      <div style={{ display: "flex", gap: `${tokens.space.xs + 2}px`, flexWrap: "wrap" }}>
        <span style={chipStyles.topic}>Cluster</span>
        <span style={chipStyles.secondary}>{topicLabel}</span>
        <span id={countId} style={chipStyles.secondary}>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      <div>
        <h3 id={titleId} style={{ margin: 0, fontSize: "20px", lineHeight: "26px", color: "#3b0764" }}>
          {title}
        </h3>
        <p style={{ margin: `${tokens.space.xs + 2}px 0 0`, color: "#4c1d95", lineHeight: "1.45" }}>{description}</p>
      </div>

      <div style={{ borderRadius: `${tokens.radius.md}px`, background: "#f5f3ff", border: "1px solid #ddd6fe", padding: `${tokens.space.sm}px` }}>
        <p id={whyId} style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "12px", fontWeight: 700, color: "#6d28d9" }}>
          Why back now
        </p>
        <p style={{ margin: `${tokens.space.xs + 2}px 0 0`, color: "#4c1d95" }}>{whyShown}</p>
      </div>

      {lastTouched ? (
        <p style={{ margin: 0, color: "#6b21a8", fontSize: "12px" }}>
          Last touch: {lastTouched}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: `${tokens.space.xs + 2}px` }} role="group" aria-label={`Actions for ${title}`}>
        {onSeeHighlights && canUse("see_highlights") ? (
          <button type="button" onClick={onSeeHighlights} style={actionStyles.primary}>
            See Highlights
          </button>
        ) : null}
        {onCompare && canUse("compare") ? (
          <button type="button" onClick={onCompare} style={actionStyles.secondary}>
            Compare Items
          </button>
        ) : null}
        {onTryOneToday && canUse("try_one_today") ? (
          <button type="button" onClick={onTryOneToday} style={actionStyles.primary}>
            Try One Today
          </button>
        ) : null}
        {onExplore && canUse("explore") ? (
          <button type="button" onClick={onExplore} style={actionStyles.secondary}>
            Explore
          </button>
        ) : null}
        {onDismiss && canUse("dismiss") ? (
          <button type="button" onClick={onDismiss} style={actionStyles.secondary}>
            Dismiss
          </button>
        ) : null}
      </div>
    </article>
  );
}

const chipStyles: Record<"topic" | "secondary", React.CSSProperties> = {
  topic: {
    borderRadius: "999px",
    border: "1px solid #c4b5fd",
    background: "#ede9fe",
    color: "#5b21b6",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700
  },
  secondary: {
    borderRadius: "999px",
    border: "1px solid #ddd6fe",
    background: "#faf5ff",
    color: "#6d28d9",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 600
  }
};

const actionStyles: Record<"primary" | "secondary", React.CSSProperties> = {
  primary: {
    border: "1px solid #c4b5fd",
    background: "#f3e8ff",
    color: "#4c1d95",
    borderRadius: "999px",
    padding: "6px 12px",
    fontWeight: 600
  },
  secondary: {
    border: "1px solid #ddd6fe",
    background: "#ffffff",
    color: "#5b21b6",
    borderRadius: "999px",
    padding: "6px 12px"
  }
};
