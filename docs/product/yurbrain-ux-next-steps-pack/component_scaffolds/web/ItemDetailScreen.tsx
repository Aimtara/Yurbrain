import React from "react";
import type { BrainItemDetailModel, ExecutionPriority, ExecutionStatus } from "./types";

type Props = {
  item: BrainItemDetailModel;
  founderMode?: boolean;
  onChangeStatus?: (value: ExecutionStatus) => void;
  onChangePriority?: (value: ExecutionPriority) => void;
  onChangeBlockedReason?: (value: string) => void;
  onAddUpdate?: () => void;
  onPlanThis?: () => void;
  onStartSession?: () => void;
  onSummarizeProgress?: () => void;
  onSuggestNext?: () => void;
};

export function ItemDetailScreen({
  item,
  founderMode = false,
  onChangeStatus,
  onChangePriority,
  onChangeBlockedReason,
  onAddUpdate,
  onPlanThis,
  onStartSession,
  onSummarizeProgress,
  onSuggestNext,
}: Props) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button className="mb-4 text-sm font-medium text-slate-600">← Back</button>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-950">{item.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{item.rawContent}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Context</p>
              <p className="mt-2 text-sm text-slate-700">{item.whyItMatters || "No why-it-matters note yet."}</p>
              {item.lastTouchedAt ? (
                <p className="mt-3 text-sm text-slate-500">Last touched {item.lastTouchedAt}</p>
              ) : null}
            </div>

            {founderMode ? (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Execution</p>

                <label className="mt-3 block text-sm font-medium text-slate-700">Execution Status</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  value={item.executionStatus || "idea"}
                  onChange={(e) => onChangeStatus?.(e.target.value as ExecutionStatus)}
                >
                  <option value="idea">Idea</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>

                <label className="mt-3 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  value={item.executionPriority || "medium"}
                  onChange={(e) => onChangePriority?.(e.target.value as ExecutionPriority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                {item.executionStatus === "blocked" ? (
                  <>
                    <label className="mt-3 block text-sm font-medium text-slate-700">What’s blocking this?</label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                      rows={3}
                      value={item.blockedReason || ""}
                      onChange={(e) => onChangeBlockedReason?.(e.target.value)}
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onAddUpdate}>
              {founderMode ? "Add Progress Update" : "Add Update"}
            </button>
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onPlanThis}>
              Plan This
            </button>
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onStartSession}>
              Start Session
            </button>
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onSummarizeProgress}>
              Summarize Progress
            </button>
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={onSuggestNext}>
              What Should I Do Next?
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Thinking Timeline</h2>
            <div className="mt-4 space-y-3">
              {item.thread.length === 0 ? (
                <p className="text-sm text-slate-500">No updates yet.</p>
              ) : (
                item.thread.map((message) => (
                  <div key={message.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{message.author}</span>
                      <span className="text-xs text-slate-400">{message.createdAt}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{message.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">AI Support</h2>
            {item.progressSummary ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Progress Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.progressSummary.summary}</p>

                {item.progressSummary.blockers.length > 0 ? (
                  <>
                    <p className="mt-4 text-sm font-medium text-slate-900">Blockers</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {item.progressSummary.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {item.progressSummary.suggestedNextStep ? (
                  <>
                    <p className="mt-4 text-sm font-medium text-slate-900">Suggested Next Step</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.progressSummary.suggestedNextStep}</p>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
                <p className="text-sm text-slate-600">
                  Not enough progress history yet. Add a few updates or complete a session to generate a stronger summary.
                </p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
