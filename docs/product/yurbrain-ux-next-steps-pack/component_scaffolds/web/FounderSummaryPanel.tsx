import React from "react";

type Props = {
  activeWorkCount: number;
  blockedCount: number;
  staleCount: number;
  suggestedNextFocus?: {
    title: string;
    reason: string;
  };
  aiSummary?: string;
};

export function FounderSummaryPanel({
  activeWorkCount,
  blockedCount,
  staleCount,
  suggestedNextFocus,
  aiSummary,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">Founder Summary</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Work</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{activeWorkCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Blocked</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{blockedCount}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stale Work</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{staleCount}</p>
        </div>
      </div>

      {suggestedNextFocus ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Suggested Next Focus</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{suggestedNextFocus.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{suggestedNextFocus.reason}</p>
        </div>
      ) : null}

      {aiSummary ? (
        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">AI Founder Summary</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{aiSummary}</p>
        </div>
      ) : null}
    </section>
  );
}
