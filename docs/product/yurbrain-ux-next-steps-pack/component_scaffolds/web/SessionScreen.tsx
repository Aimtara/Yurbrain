import React from "react";

type Props = {
  title: string;
  focusNote?: string;
  elapsedLabel: string;
  onPause?: () => void;
  onFinish?: () => void;
  onBlocked?: () => void;
};

export function SessionScreen({ title, focusNote, elapsedLabel, onPause, onFinish, onBlocked }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-3xl bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Working on</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>

        {focusNote ? (
          <div className="mt-6 rounded-2xl bg-slate-800 p-4">
            <p className="text-sm font-medium text-slate-300">Focus note</p>
            <p className="mt-2 text-base text-slate-100">{focusNote}</p>
          </div>
        ) : null}

        <div className="mt-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Time elapsed</p>
          <p className="mt-3 text-6xl font-bold">{elapsedLabel}</p>
          <p className="mt-3 text-sm text-slate-400">Stay with one thing for now.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <button className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium" onClick={onPause}>
            Pause
          </button>
          <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950" onClick={onFinish}>
            Finish
          </button>
          <button className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium" onClick={onBlocked}>
            Blocked
          </button>
        </div>
      </section>
    </main>
  );
}
