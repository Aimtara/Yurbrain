import React from "react";

export function FeedCard({
  title,
  body,
  onComment,
  onConvertToTask,
  onDismiss,
  onSnooze,
  onRefresh
}: {
  title: string;
  body: string;
  onComment?: (value: string) => void;
  onConvertToTask?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: number) => void;
  onRefresh?: () => void;
}) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{body}</p>
      {onComment ? <button onClick={() => onComment("Looks important")}>Quick comment</button> : null}
      {onConvertToTask ? <button onClick={onConvertToTask}>Convert to task</button> : null}
      {onDismiss ? <button onClick={onDismiss}>Dismiss</button> : null}
      {onSnooze ? <button onClick={() => onSnooze(120)}>Snooze 2h</button> : null}
      {onRefresh ? <button onClick={onRefresh}>Refresh</button> : null}
    </article>
  );
}
