import React, { useMemo, useState } from "react";
import { FeedCard } from "./FeedCard";
import type { FeedCardModel, FeedLens } from "./types";

type Props = {
  cards: FeedCardModel[];
  defaultLens?: FeedLens;
  onOpenCard?: (id: string) => void;
  onAction?: (id: string, action: FeedCardModel["actions"][number]) => void;
};

const LENSES: FeedLens[] = ["all", "execution", "open_loops", "keep_in_mind", "recent"];

export function FocusFeedScreen({ cards, defaultLens = "all", onOpenCard, onAction }: Props) {
  const [lens, setLens] = useState<FeedLens>(defaultLens);

  const filtered = useMemo(() => {
    if (lens === "all") return cards;
    if (lens === "execution") return cards.filter((c) => c.executionStatus && c.executionStatus !== "done");
    if (lens === "recent") return [...cards].sort((a, b) => (a.lastTouchedAt || "").localeCompare(b.lastTouchedAt || "")).reverse();
    return cards.filter((c) => c.type === lens.slice(0, -1) || c.type === lens);
  }, [cards, lens]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Yurbrain</p>
            <h1 className="text-3xl font-bold text-slate-950">Focus</h1>
          </div>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium">
            Founder ⚡
          </button>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {LENSES.map((entry) => (
            <button
              key={entry}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                entry === lens ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
              }`}
              onClick={() => setLens(entry)}
            >
              {entry.replace("_", " ")}
            </button>
          ))}
        </nav>

        <section className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No active items yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Capture something or mark an item as execution work to get started.
              </p>
            </div>
          ) : (
            filtered.map((card) => (
              <FeedCard key={card.id} card={card} onOpen={onOpenCard} onAction={onAction} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
