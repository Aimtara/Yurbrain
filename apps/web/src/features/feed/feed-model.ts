import type { ExecutionLens, FeedCardVariant } from "@yurbrain/ui";

import type { BrainItemDto, ContinuityContext, FeedAction, FeedCardDto, TaskDto, SessionDto, UserPreferenceDto } from "../shared/types";

export function deriveFeedRequestLimit(
  feedDensity: UserPreferenceDto["feedDensity"],
  resurfacingIntensity: UserPreferenceDto["resurfacingIntensity"]
): number {
  const densityBase = feedDensity === "compact" ? 12 : 9;
  const intensityDelta = resurfacingIntensity === "gentle" ? -2 : resurfacingIntensity === "active" ? 2 : 0;
  return Math.max(6, Math.min(16, densityBase + intensityDelta));
}

export function formatRelative(isoValue?: string): string | undefined {
  if (!isoValue) return undefined;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return undefined;
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function inferVariant(card: FeedCardDto, relatedTask?: TaskDto, relatedSession?: SessionDto): FeedCardVariant {
  if (card.stateFlags.dismissed) return "done";
  if (relatedTask?.status === "done") return "done";
  if (relatedSession?.state === "running") return "execution";
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (blockedState) return "blocked";
  if (relatedTask?.status === "in_progress" || card.cardType === "resume") return "execution";
  if (card.cardType === "open_loop") return "resume";
  const summary = card.whyShown.summary.toLowerCase();
  if (summary.includes("resume") || summary.includes("revisit") || summary.includes("return")) return "resume";
  if (summary.includes("in progress") || summary.includes("next step") || summary.includes("continue")) return "execution";
  return "default";
}

export function inferBlockedState(card: FeedCardDto, relatedTask?: TaskDto, relatedSession?: SessionDto): string | undefined {
  if (relatedSession?.state === "running") return undefined;
  const postponeCount = card.postponeCount ?? 0;
  if (postponeCount >= 2) {
    const lastPostponed = formatRelative(card.lastPostponedAt ?? undefined);
    return lastPostponed ? `Postponed ${postponeCount} times (last ${lastPostponed})` : `Postponed ${postponeCount} times`;
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") {
    return "Task is in progress but not actively moving.";
  }
  if (relatedTask?.status === "todo" && postponeCount > 0) {
    return "Task exists but keeps getting deferred.";
  }
  const explicitReason = card.whyShown.reasons.find((reason) => /blocked|waiting|stuck|dependency|approval|review/i.test(reason));
  if (explicitReason) return explicitReason;
  if (/blocked|waiting|stale|stuck/i.test(card.whyShown.summary)) {
    return card.whyShown.summary;
  }
  return undefined;
}

export function inferNextStep(
  card: FeedCardDto,
  variant: FeedCardVariant,
  relatedTask?: TaskDto,
  relatedSession?: SessionDto,
  relatedItem?: BrainItemDto
): string {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (relatedTask?.status === "todo") {
    if (relatedItem) {
      return `Open "${relatedItem.title}" and start the linked task with one focused 15-minute session.`;
    }
    return "Start the linked task with one focused 15-minute session.";
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") return "Resume your paused session and finish one concrete sub-step.";
  if (relatedTask?.status === "in_progress") return "Resume execution and finish one concrete sub-step.";
  if (relatedTask?.status === "done") return "Close the loop with one reflection note.";
  const reasonWithStep = card.whyShown.reasons.find((reason) => /next|step|follow|continue|resume/i.test(reason));
  if (reasonWithStep) return reasonWithStep;
  if (variant === "blocked") {
    if (blockedState?.startsWith("Postponed")) {
      return "Re-open this and write one unblock note before postponing again.";
    }
    return "Resolve the blocker with one message or one smaller scope cut.";
  }
  if (variant === "done") return "Close the loop with a reflection note, then return to feed.";
  return "Open and add one continuation note.";
}

export function inferContinuityNote(
  card: FeedCardDto,
  variant: FeedCardVariant,
  relatedTask?: TaskDto,
  relatedSession?: SessionDto,
  relatedItem?: BrainItemDto
): string | undefined {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (variant === "blocked" && blockedState) {
    return `Blocked signal: ${blockedState}`;
  }
  if (!card.itemId && relatedTask?.sourceItemId && relatedItem) {
    return `Source item "${relatedItem.title}" was touched ${formatRelative(relatedItem.updatedAt) ?? "recently"}.`;
  }
  return card.whyShown.reasons.find((reason) => !/next|step|follow|continue|resume/i.test(reason));
}

export function inferWhereLeftOff(
  card: FeedCardDto,
  variant: FeedCardVariant,
  relatedTask?: TaskDto,
  relatedSession?: SessionDto,
  relatedItem?: BrainItemDto
): string | undefined {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (variant === "blocked" && blockedState) {
    return `Last state: ${blockedState}`;
  }
  if (!card.itemId && relatedTask?.sourceItemId && relatedItem) {
    return `Converted from "${relatedItem.title}" and queued for execution.`;
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") return "Execution is paused and ready to resume.";
  if (relatedTask?.status === "in_progress") return "Execution is already in progress.";
  if (relatedTask?.status === "todo") return "You already converted this into a lightweight task.";
  if (relatedTask?.status === "done") return "The linked task is done; this is back for closure.";
  return card.whyShown.reasons.find((reason) => /left|last|previous|revisit|resume/i.test(reason));
}

export function inferPrimaryActionLabel(card: FeedCardDto, canOpenContinuity: boolean): string {
  if (canOpenContinuity) return "Open continuity";
  if (card.stateFlags.hasSourceTask) return "Open execution";
  if (card.stateFlags.hasSourceItem) return "Open continuity";
  return "Open";
}

export function buildSyntheticDetailCard(item: BrainItemDto | null, task: TaskDto | null, continuity: ContinuityContext | null): FeedCardDto {
  const continuityReasons = [continuity?.blockedState, continuity?.changedSince].filter((reason): reason is string => Boolean(reason));
  return {
    id: item?.id ?? "detail-view",
    cardType: "item",
    lens: "all",
    itemId: item?.id ?? null,
    taskId: task?.id ?? null,
    title: item?.title ?? "Item",
    body: item?.rawContent ?? "",
    dismissed: false,
    snoozedUntil: null,
    refreshCount: 0,
    postponeCount: 0,
    lastPostponedAt: null,
    lastRefreshedAt: null,
    availableActions: ["open_item", "comment", "convert_to_task", "dismiss", "snooze", "refresh"],
    stateFlags: {
      dismissed: false,
      snoozed: false,
      actionable: true,
      hasSourceItem: true,
      hasSourceTask: Boolean(task)
    },
    whyShown: {
      summary: continuity?.whyShown ?? "Continue this item in one small step.",
      reasons: continuityReasons
    },
    createdAt: item?.createdAt ?? new Date().toISOString()
  };
}

export function matchesExecutionLens(variant: FeedCardVariant, lens: ExecutionLens): boolean {
  if (lens === "all") return true;
  if (lens === "ready_to_move") return variant === "execution" || variant === "resume";
  if (lens === "needs_unblock") return variant === "blocked";
  return variant === "execution" || variant === "done";
}

export function supportsAction(card: FeedCardDto, action: FeedAction): boolean {
  return card.availableActions.includes(action);
}
