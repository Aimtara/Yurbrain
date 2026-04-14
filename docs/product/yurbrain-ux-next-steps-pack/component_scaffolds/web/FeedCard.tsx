import React from "react";
import type { FeedCardModel } from "./types";

type Props = {
  card: FeedCardModel;
  onOpen?: (id: string) => void;
  onAction?: (id: string, action: FeedCardModel["actions"][number]) => void;
};

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium">
      {label}
    </span>
  );
}

export function FeedCard({ card, onOpen, onAction }: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge label={card.type.replace("_", " ")} />
          {card.executionStatus ? <Badge label={card.executionStatus.replace("_", " ")} /> : null}
          {card.executionPriority ? <Badge label={`${card.executionPriority} priority`} /> : null}
        </div>
        {card.lastTouchedAt ? (
          <span className="text-xs text-slate-500">Last touched {card.lastTouchedAt}</span>
        ) : null}
      </div>

      <button
        className="mb-2 block w-full text-left"
        onClick={() => onOpen?.(card.id)}
        aria-label={`Open ${card.title}`}
      >
        <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{card.preview}</p>
      </button>

      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Why this surfaced</p>
        <p className="mt-1 text-sm text-slate-700">{card.whyShown}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {card.actions.map((action) => (
          <button
            key={action}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => onAction?.(card.id, action)}
          >
            {action.replaceAll("_", " ")}
          </button>
        ))}
      </div>
    </article>
  );
}
