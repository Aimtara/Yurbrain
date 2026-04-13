import React from "react";

type BrainItemDetailProps = {
  title: string;
  rawContent: string;
  summary?: string;
  classification?: string;
  onSummarize?: () => void;
  onClassify?: () => void;
};

export function BrainItemDetail({
  title,
  rawContent,
  summary,
  classification,
  onSummarize,
  onClassify
}: BrainItemDetailProps) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{rawContent}</p>
      <div>
        <button type="button" onClick={onSummarize} disabled={!onSummarize}>
          Summarize
        </button>
        <button type="button" onClick={onClassify} disabled={!onClassify}>
          Classify
        </button>
      </div>
      {summary ? <p aria-label="AI summary">{summary}</p> : null}
      {classification ? <p aria-label="AI classification">{classification}</p> : null}
    </section>
  );
}
