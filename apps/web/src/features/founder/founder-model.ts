import type { BrainItemDto, FeedCardModel, TaskDto } from "../shared/types";
import { formatRelative } from "../feed/feed-model";

export type FounderFocusCandidate = {
  title: string;
  reason: string;
  nextStep: string;
  sourceItemId: string;
  continuity: FeedCardModel["continuity"];
};

export type FounderBlockedCandidate = {
  id: string;
  title: string;
  reason: string;
  nextMove: string;
  sourceItemId: string;
  continuity: FeedCardModel["continuity"];
};

export function buildFounderStats(feedModels: FeedCardModel[], visibleFeedModels: FeedCardModel[]) {
  return [
    { label: "Cards in focus", value: String(visibleFeedModels.length) },
    {
      label: "Ready to move",
      value: String(feedModels.filter((model) => model.variant === "execution" || model.variant === "resume").length)
    },
    { label: "Needs unblock", value: String(feedModels.filter((model) => model.variant === "blocked").length) }
  ];
}

export function buildFounderSuggestedFocus(visibleFeedModels: FeedCardModel[]): FounderFocusCandidate | null {
  const candidate = visibleFeedModels
    .filter((model) => Boolean(model.continuity.sourceItemId))
    .sort((left, right) => {
      const leftBlocked = left.variant === "blocked" ? 30 : 0;
      const rightBlocked = right.variant === "blocked" ? 30 : 0;
      const leftReady = left.variant === "execution" || left.variant === "resume" ? 18 : 0;
      const rightReady = right.variant === "execution" || right.variant === "resume" ? 18 : 0;
      const leftPostpone = Math.min(left.card.postponeCount ?? 0, 4) * 4;
      const rightPostpone = Math.min(right.card.postponeCount ?? 0, 4) * 4;
      return rightBlocked + rightReady + rightPostpone - (leftBlocked + leftReady + leftPostpone);
    })[0];

  if (!candidate?.continuity.sourceItemId) return null;

  const reason = candidate.continuity.blockedState
    ? `Blocked: ${candidate.continuity.blockedState}`
    : candidate.continuity.whyShown ?? "Worth revisiting now.";

  return {
    title: candidate.card.title,
    reason,
    nextStep: candidate.continuity.nextStep ?? "Open and leave one continuation note.",
    sourceItemId: candidate.continuity.sourceItemId,
    continuity: candidate.continuity
  };
}

export function buildFounderBlockedItems(visibleFeedModels: FeedCardModel[]): FounderBlockedCandidate[] {
  return visibleFeedModels
    .filter((model) => model.variant === "blocked" && model.continuity.sourceItemId)
    .slice(0, 2)
    .map((model) => ({
      id: model.card.id,
      title: model.card.title,
      reason: model.continuity.blockedState ?? "Blocked signal detected.",
      nextMove: model.continuity.nextStep ?? "Open and leave one unblock note.",
      sourceItemId: model.continuity.sourceItemId ?? "",
      continuity: model.continuity
    }));
}

export function buildFounderSummaryText(feedModels: FeedCardModel[], items: BrainItemDto[], tasks: TaskDto[]): string {
  if (feedModels.length === 0) {
    return "Capture a few thoughts first. Founder mode will summarize execution signals once your feed has continuity history.";
  }
  const changedSource = items[0];
  const changedSignal = changedSource
    ? `${changedSource.title} touched ${formatRelative(changedSource.updatedAt) ?? "recently"}`
    : "No recent updates yet";
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const blockedModels = feedModels.filter((model) => model.variant === "blocked");
  const readyModels = feedModels.filter((model) => model.variant === "execution" || model.variant === "resume");
  const nextSignal = blockedModels[0]?.continuity.nextStep ?? readyModels[0]?.continuity.nextStep ?? "Open one item and leave one continuation note.";
  return `Changed: ${changedSignal}. Done: ${doneCount} tasks. Blocked: ${blockedModels.length} cards. Next: ${nextSignal}`;
}
