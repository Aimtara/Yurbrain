import type { FeedCardDto, FeedCardModel } from "./types";
import { formatRelativeTime, formatTimeSignal } from "./time";

function inferBlockedState(card: FeedCardDto): string | undefined {
  const postponeCount = card.postponeCount ?? 0;
  if (postponeCount >= 2) {
    const last = card.lastPostponedAt ? formatRelativeTime(card.lastPostponedAt) : null;
    return last ? `Postponed ${postponeCount} times (last ${last})` : `Postponed ${postponeCount} times`;
  }
  const explicitReason = card.whyShown.reasons.find((reason) => /blocked|waiting|stuck|dependency|approval|review/i.test(reason));
  if (explicitReason) return explicitReason;
  if (/blocked|waiting|stale|stuck/i.test(card.whyShown.summary)) return card.whyShown.summary;
  return undefined;
}

function inferVariant(card: FeedCardDto): FeedCardModel["variant"] {
  if (card.stateFlags.dismissed) return "done";
  const blocked = inferBlockedState(card);
  if (blocked) return "blocked";
  if (card.cardType === "resume") return "execution";
  if (card.cardType === "open_loop") return "resume";
  const summary = card.whyShown.summary.toLowerCase();
  if (summary.includes("resume") || summary.includes("revisit") || summary.includes("return")) return "resume";
  if (summary.includes("in progress") || summary.includes("next step") || summary.includes("continue")) return "execution";
  return "default";
}

function inferNextStep(card: FeedCardDto, variant: FeedCardModel["variant"]): string {
  const reasonWithStep = card.whyShown.reasons.find((reason) => /next|step|follow|continue|resume/i.test(reason));
  if (reasonWithStep) return reasonWithStep.length <= 100 ? reasonWithStep : `${reasonWithStep.slice(0, 97).trimEnd()}...`;
  if (variant === "blocked") return "Re-open and write one unblock note.";
  if (variant === "done") return "Close the loop with one reflection note.";
  if (variant === "execution") return "Continue with one concrete next move.";
  return "Open and add one continuation note.";
}

function inferWhereLeftOff(card: FeedCardDto, blockedState?: string): string | undefined {
  if (blockedState) return `Last state: ${blockedState}`;
  return card.whyShown.reasons.find((reason) => /left|last|previous|revisit|resume/i.test(reason));
}

function inferChangedSince(card: FeedCardDto, blockedState?: string): string | undefined {
  if (blockedState) return `Current blocker: ${blockedState}`;
  return card.whyShown.reasons.find((reason) => !/next|step|follow|continue|resume/i.test(reason));
}

export function buildFeedCardModel(card: FeedCardDto): FeedCardModel {
  const blockedState = inferBlockedState(card);
  const variant = inferVariant(card);
  return {
    card,
    variant,
    continuity: {
      whyShown: card.whyShown.summary,
      lastTouched: formatTimeSignal(card.lastRefreshedAt, card.createdAt, card.lastTouched),
      whereLeftOff: inferWhereLeftOff(card, blockedState),
      changedSince: inferChangedSince(card, blockedState),
      blockedState,
      nextStep: inferNextStep(card, variant)
    }
  };
}
