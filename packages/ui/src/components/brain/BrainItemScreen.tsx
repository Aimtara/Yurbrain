import React, { useMemo } from "react";

import { BrainItemDetail } from "./BrainItemDetail";
import { CommentComposer } from "../feed/CommentComposer";

type QuickAction = "summarize" | "classify" | "convert_to_task";

export type BrainItemScreenProps = {
  item: {
    id: string;
    title: string;
    rawContent: string;
  };
  comments: string[];
  summary?: string;
  classification?: string;
  onQuickAction: (action: QuickAction) => void;
  onAddComment: (comment: string) => void;
};

export function BrainItemScreen({ item, comments, summary, classification, onQuickAction, onAddComment }: BrainItemScreenProps) {
  const commentPreview = useMemo(() => comments.slice(0, 3), [comments]);

  return (
    <section aria-label="Brain item screen">
      <BrainItemDetail
        title={item.title}
        rawContent={item.rawContent}
        summary={summary}
        classification={classification}
        onSummarize={() => onQuickAction("summarize")}
        onClassify={() => onQuickAction("classify")}
      />

      <div>
        <h3>Quick actions</h3>
        <button type="button" onClick={() => onQuickAction("summarize")}>
          Summarize
        </button>
        <button type="button" onClick={() => onQuickAction("classify")}>
          Classify
        </button>
        <button type="button" onClick={() => onQuickAction("convert_to_task")}>
          Convert to task
        </button>
      </div>

      <div>
        <h3>Comment preview</h3>
        {commentPreview.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul>
            {commentPreview.map((comment) => (
              <li key={comment}>{comment}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3>Add comment</h3>
        <CommentComposer
          onSend={(value) => {
            const normalized = value.trim();
            if (!normalized) return;
            onAddComment(normalized);
          }}
        />
      </div>
    </section>
  );
}
