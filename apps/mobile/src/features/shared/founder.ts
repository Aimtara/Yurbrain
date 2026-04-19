import { formatIsoRelative } from "./time";
import type { BrainItemDto, FeedCardModel, TaskDto } from "./types";

function scoreCard(model: FeedCardModel): number {
  let score = 0;
  if (model.variant === "execution" || model.variant === "resume") score += 20;
  if (model.variant === "blocked") score += 24;
  score += Math.min(model.card.postponeCount ?? 0, 4) * 4;
  return score;
}

function buildFounderSummaryText(models: FeedCardModel[], items: BrainItemDto[], tasks: TaskDto[]): string {
  if (models.length === 0) {
    return "Capture a few thoughts first. Founder mode will summarize execution signals once your feed has continuity history.";
  }
  const mostRecentItem = [...items]
    .filter((item) => Boolean(item.updatedAt))
    .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))[0];
  const changedSignal = mostRecentItem ? `${mostRecentItem.title} touched ${formatIsoRelative(mostRecentItem.updatedAt)}` : "No recent updates yet";
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const blockedCount = models.filter((model) => model.variant === "blocked").length;
  const ready = models.filter((model) => model.variant === "execution" || model.variant === "resume");
  const nextSignal =
    models.find((model) => model.variant === "blocked")?.continuity.nextStep ??
    ready[0]?.continuity.nextStep ??
    "Open one item and leave one continuation note.";
  return `Changed: ${changedSignal}. Done: ${doneCount} tasks. Blocked: ${blockedCount} cards. Next: ${nextSignal}`;
}

export function buildFounderSummary(
  models: FeedCardModel[],
  context: {
    items: BrainItemDto[];
    tasks: TaskDto[];
  } = { items: [], tasks: [] }
): {
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
  const summary = buildFounderSummaryText(models, context?.items ?? [], context?.tasks ?? []);
  return { stats, summary, suggested, blocked };
}
