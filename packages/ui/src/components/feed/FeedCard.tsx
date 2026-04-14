import React from "react";

export function FeedCard({
  title,
  body,
  whyShown,
  onComment,
  onConvertToTask,
  onDismiss,
  onSnooze,
  onRefresh
}: {
  title: string;
  body: string;
  whyShown?: { summary: string; reasons: string[] } | string;
  onComment?: (value: string) => void;
  onConvertToTask?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  const whyShownSummary = typeof whyShown === "string" ? whyShown : whyShown?.summary;

  return (
    <article>
      <h3>{title}</h3>
      <p>{body}</p>
      {whyShownSummary ? (
        <p>
          <strong>Why shown:</strong> {whyShownSummary}
        </p>
      ) : null}
      {onComment ? <button onClick={() => onComment("Looks important")}>Quick comment</button> : null}
      {onConvertToTask ? <button onClick={onConvertToTask}>Convert to task</button> : null}
      {onDismiss ? <button onClick={onDismiss}>Dismiss</button> : null}
      {onSnooze ? <button onClick={() => onSnooze(120)}>Snooze 2h</button> : null}
      {onRefresh ? <button onClick={onRefresh}>Refresh</button> : null}
    </article>
  );
}
