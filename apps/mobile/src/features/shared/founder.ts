import type { FeedCardModel } from "./types";

function scoreCard(model: FeedCardModel): number {
  let score = 0;
  if (model.variant === "execution" || model.variant === "resume") score += 20;
  if (model.variant === "blocked") score += 24;
  score += Math.min(model.card.postponeCount ?? 0, 4) * 4;
  return score;
}

export function buildFounderSummary(models: FeedCardModel[]): {
  stats: Array<{ label: string; value: string }>;
  summary: string;
  suggested: FeedCardModel | null;
  blocked: FeedCardModel[];
} {
  const suggested = [...models]
    .filter((model) => Boolean(model.card.itemId))
    .sort((left, right) => scoreCard(right) - scoreCard(left))[0] ?? null;
  const blocked = models.filter((model) => model.variant === "blocked").slice(0, 2);
  const ready = models.filter((model) => model.variant === "execution" || model.variant === "resume").length;
  const stats = [
    { label: "Cards in focus", value: String(models.length) },
    { label: "Ready to move", value: String(ready) },
    { label: "Needs unblock", value: String(blocked.length) }
  ];
  const summary = suggested
    ? `Suggested focus: ${suggested.card.title}. Next: ${suggested.continuity.nextStep ?? "Open and continue with one update."}`
    : "Capture a thought to start founder execution signals.";
  return { stats, summary, suggested, blocked };
}
