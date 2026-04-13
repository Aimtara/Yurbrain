import React from "react";

export function FeedCard({
  title,
  body,
  onComment,
  onConvertToTask
}: {
  title: string;
  body: string;
  onComment?: (value: string) => void;
  onConvertToTask?: () => void;
}) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{body}</p>
      {onComment ? <button onClick={() => onComment("Looks important")}>Quick comment</button> : null}
      {onConvertToTask ? <button onClick={onConvertToTask}>Convert to task</button> : null}
    </article>
  );
}
