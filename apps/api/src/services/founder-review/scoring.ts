import type {
  FounderReviewAction,
  FounderReviewResponse,
  FounderReviewRiskFlag,
  FounderReviewScore
} from "../../../../../packages/contracts/src";
import type { FounderReviewSignals } from "./types";

type ScoreStatus = FounderReviewScore["status"];

type BaseMetrics = {
  captureCount: number;
  founderCaptureCount: number;
  feedCardsShown: number;
  feedCardsDismissed: number;
  feedCardsSnoozed: number;
  feedCardsRefreshed: number;
  continuationTouches: number;
  touchedItemsCount: number;
  convertCount: number;
  convertedItemCount: number;
  sessionStartedCount: number;
  sessionFinishedCount: number;
  reopenedItemsCount: number;
  activeWork: number;
  blockedWork: number;
  staleWork: number;
  staleItemIds: string[];
  blockedItemIds: string[];
  continueGapItemIds: string[];
  mobileCaptureCount: number;
  webCaptureCount: number;
  mobileToWebCount: number;
  webToMobileCount: number;
  feedConsistencyValue: number;
  stateContinuityValue: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreStatus(score: number): ScoreStatus {
  if (score >= 75) return "strong";
  if (score >= 50) return "watch";
  return "weak";
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function averageScore(values: number[]): number {
  if (values.length === 0) return 0;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function scoreFromRatio(ratio: number, floor: number, ceiling = 1): number {
  if (!Number.isFinite(ratio)) return 0;
  const normalized = Math.max(0, Math.min(1, (ratio - floor) / (ceiling - floor)));
  return clampScore(normalized * 100);
}

function uniqueCount(values: Iterable<string>): number {
  return new Set(values).size;
}

function toAction(
  id: string,
  label: string,
  input: Partial<FounderReviewAction> = {}
): FounderReviewAction {
  return {
    id,
    label,
    target: input.target ?? "feed",
    lens: input.lens,
    executionLens: input.executionLens,
    itemId: input.itemId,
    itemIds: input.itemIds
  };
}

function buildMetrics(signals: FounderReviewSignals): BaseMetrics {
  const captureItems = signals.items.filter((item) => item.platformOrigin !== "unknown");
  const feedCardsShown = signals.feedCards.length;
  const feedCardsDismissed = signals.feedCards.filter((card) => card.dismissed).length;
  const feedCardsSnoozed = signals.feedCards.filter((card) => card.postponeCount > 0).length;
  const feedCardsRefreshed = signals.feedCards.filter((card) => card.refreshCount > 0).length;

  const continuationTouches =
    signals.messages.length +
    signals.items.filter((item) => new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 5 * 60_000).length;
  const touchedItemsCount = uniqueCount(signals.messages.map((message) => message.itemId));
  const convertedItemIds = signals.tasks.filter((task) => Boolean(task.sourceItemId)).map((task) => task.sourceItemId as string);
  const convertedItemCount = uniqueCount(convertedItemIds);
  const convertCount = signals.tasks.length;

  const sessionStartedCount = signals.sessions.length;
  const sessionFinishedCount = signals.sessions.filter((session) => session.state === "finished").length;

  const reopenedItemsCount = signals.items.filter((item) => {
    const openedAfterFirstDay = signals.messages.some((message) => {
      if (message.itemId !== item.id) return false;
      return new Date(message.createdAt).getTime() - new Date(item.createdAt).getTime() > 24 * 60 * 60 * 1000;
    });
    if (openedAfterFirstDay) return true;
    return signals.tasks.some((task) => task.sourceItemId === item.id && new Date(task.createdAt).getTime() - new Date(item.createdAt).getTime() > 24 * 60 * 60 * 1000);
  }).length;

  const nowMs = Date.now();
  const staleThresholdMs = 72 * 60 * 60 * 1000;
  const staleItemIds = signals.items
    .filter((item) => nowMs - new Date(item.updatedAt).getTime() > staleThresholdMs)
    .map((item) => item.id);

  const blockedByPostpone = signals.feedCards
    .filter((card) => card.postponeCount >= 2 && card.itemId)
    .map((card) => card.itemId as string);
  const blockedByTask = signals.tasks
    .filter((task) => task.status === "todo")
    .map((task) => task.sourceItemId)
    .filter((itemId): itemId is string => Boolean(itemId));
  const blockedItemIds = Array.from(new Set([...blockedByPostpone, ...blockedByTask]));

  const continueGapItemIds = signals.items
    .filter((item) => {
      const hasTouch = signals.messages.some((message) => message.itemId === item.id);
      const hasTask = signals.tasks.some((task) => task.sourceItemId === item.id);
      return !hasTouch && !hasTask;
    })
    .map((item) => item.id);

  const mobileCaptureCount = captureItems.filter((item) => item.platformOrigin === "mobile").length;
  const webCaptureCount = captureItems.filter((item) => item.platformOrigin === "web").length;

  const mobileToWebCount = captureItems.filter((item) => {
    if (item.platformOrigin !== "mobile") return false;
    const touchedOnWeb = signals.messages.some((message) => message.itemId === item.id && message.platform === "web");
    const convertedOnWeb = signals.tasks.some((task) => task.sourceItemId === item.id && task.platformOrigin === "web");
    return touchedOnWeb || convertedOnWeb;
  }).length;

  const webToMobileCount = captureItems.filter((item) => {
    if (item.platformOrigin !== "web") return false;
    const touchedOnMobile = signals.messages.some((message) => message.itemId === item.id && message.platform === "mobile");
    const convertedOnMobile = signals.tasks.some((task) => task.sourceItemId === item.id && task.platformOrigin === "mobile");
    return touchedOnMobile || convertedOnMobile;
  }).length;

  const feedConsistencyValue = safeDivide(
    signals.feedCards.filter((card) => card.hasWhyShown && card.hasActionability).length,
    Math.max(signals.feedCards.length, 1)
  );
  const stateContinuityValue = safeDivide(
    signals.tasks.filter((task) => !task.sourceItemId || signals.items.some((item) => item.id === task.sourceItemId)).length,
    Math.max(signals.tasks.length, 1)
  );

  return {
    captureCount: signals.items.length,
    founderCaptureCount: signals.items.filter((item) => item.founderModeAtCapture).length,
    feedCardsShown,
    feedCardsDismissed,
    feedCardsSnoozed,
    feedCardsRefreshed,
    continuationTouches,
    touchedItemsCount,
    convertCount,
    convertedItemCount,
    sessionStartedCount,
    sessionFinishedCount,
    reopenedItemsCount,
    activeWork: signals.tasks.filter((task) => task.status === "in_progress").length,
    blockedWork: blockedItemIds.length,
    staleWork: staleItemIds.length,
    staleItemIds,
    blockedItemIds,
    continueGapItemIds,
    mobileCaptureCount,
    webCaptureCount,
    mobileToWebCount,
    webToMobileCount,
    feedConsistencyValue,
    stateContinuityValue
  };
}

function scoreCapture(metrics: BaseMetrics): number {
  const volumeScore = scoreFromRatio(safeDivide(metrics.captureCount, 12), 0.25);
  const founderSignal = scoreFromRatio(safeDivide(metrics.founderCaptureCount, Math.max(metrics.captureCount, 1)), 0.1);
  return averageScore([volumeScore, founderSignal]);
}

function scoreResurface(metrics: BaseMetrics): number {
  const showRatio = safeDivide(metrics.feedCardsShown, Math.max(metrics.captureCount, 1));
  const dismissRatio = safeDivide(metrics.feedCardsDismissed, Math.max(metrics.feedCardsShown, 1));
  const snoozeRatio = safeDivide(metrics.feedCardsSnoozed, Math.max(metrics.feedCardsShown, 1));
  const refreshRatio = safeDivide(metrics.feedCardsRefreshed, Math.max(metrics.feedCardsShown, 1));

  const visibilityScore = scoreFromRatio(showRatio, 0.4);
  const dismissScore = clampScore((1 - Math.min(1, dismissRatio / 0.6)) * 100);
  const postponementScore = clampScore((1 - Math.min(1, snoozeRatio / 0.8)) * 100);
  const freshnessScore = scoreFromRatio(refreshRatio, 0.05);
  return averageScore([visibilityScore, dismissScore, postponementScore, freshnessScore]);
}

function scoreContinue(metrics: BaseMetrics): number {
  const touchCoverage = safeDivide(metrics.touchedItemsCount, Math.max(metrics.captureCount, 1));
  const touchDepth = safeDivide(metrics.continuationTouches, Math.max(metrics.captureCount, 1));
  const gapPenalty = clampScore((1 - Math.min(1, safeDivide(metrics.continueGapItemIds.length, Math.max(metrics.captureCount, 1)))) * 100);
  return averageScore([scoreFromRatio(touchCoverage, 0.2), scoreFromRatio(touchDepth, 0.4), gapPenalty]);
}

function scoreConvert(metrics: BaseMetrics): number {
  const conversionCoverage = safeDivide(metrics.convertedItemCount, Math.max(metrics.captureCount, 1));
  const conversionVolume = safeDivide(metrics.convertCount, Math.max(metrics.captureCount, 1));
  return averageScore([scoreFromRatio(conversionCoverage, 0.15), scoreFromRatio(conversionVolume, 0.2)]);
}

function scoreAct(metrics: BaseMetrics): number {
  const startCoverage = safeDivide(metrics.sessionStartedCount, Math.max(metrics.convertCount, 1));
  const finishRatio = safeDivide(metrics.sessionFinishedCount, Math.max(metrics.sessionStartedCount, 1));
  return averageScore([scoreFromRatio(startCoverage, 0.2), scoreFromRatio(finishRatio, 0.3)]);
}

function scoreReturn(metrics: BaseMetrics): number {
  const returnCoverage = safeDivide(metrics.reopenedItemsCount, Math.max(metrics.captureCount, 1));
  const stalePenalty = clampScore((1 - Math.min(1, safeDivide(metrics.staleWork, Math.max(metrics.captureCount, 1)))) * 100);
  return averageScore([scoreFromRatio(returnCoverage, 0.1), stalePenalty]);
}

function makeScore(
  key: string,
  label: string,
  score: number,
  action: FounderReviewAction
): FounderReviewScore {
  return {
    key,
    label,
    score: clampScore(score),
    status: scoreStatus(clampScore(score)),
    action
  };
}

function weakestScore(scores: FounderReviewScore[]): FounderReviewScore {
  return [...scores].sort((left, right) => left.score - right.score)[0] ?? scores[0];
}

function strongestScore(scores: FounderReviewScore[]): FounderReviewScore {
  return [...scores].sort((left, right) => right.score - left.score)[0] ?? scores[0];
}

function createRiskFlags(
  loopScores: FounderReviewScore[],
  metrics: BaseMetrics
): FounderReviewRiskFlag[] {
  const flags: FounderReviewRiskFlag[] = [];
  const continueScore = loopScores.find((score) => score.key === "continue");
  const actScore = loopScores.find((score) => score.key === "act");

  if (continueScore && continueScore.score < 55) {
    flags.push({
      id: "weak_continue",
      severity: "high",
      title: "Continuation is dropping after item opens",
      detail: `${metrics.continueGapItemIds.length} captured items still have no continuation touch.`,
      action: toAction("review-continue-gap", "Open uncontinued items", {
        target: "feed",
        lens: "open_loops",
        itemIds: metrics.continueGapItemIds.slice(0, 12)
      })
    });
  }

  if (actScore && actScore.score < 55 && metrics.convertCount > 0) {
    flags.push({
      id: "execution_dropoff",
      severity: "high",
      title: "Execution drops after conversion",
      detail: `${metrics.convertCount} conversions produced ${metrics.sessionStartedCount} started sessions.`,
      action: toAction("open-ready-execution", "Open ready-to-move execution lens", {
        target: "feed",
        executionLens: "ready_to_move"
      })
    });
  }

  if (metrics.blockedWork > 0) {
    flags.push({
      id: "blocked_work",
      severity: metrics.blockedWork >= 4 ? "high" : "medium",
      title: "Blocked founder work is accumulating",
      detail: `${metrics.blockedWork} items show postpone/task stall signals.`,
      action: toAction("open-blocked-items", "Open blocked execution lens", {
        target: "feed",
        executionLens: "needs_unblock",
        itemIds: metrics.blockedItemIds.slice(0, 12)
      })
    });
  }

  const mobileContinuityRatio = safeDivide(metrics.mobileToWebCount, Math.max(metrics.mobileCaptureCount, 1));
  if (metrics.mobileCaptureCount >= 2 && mobileContinuityRatio < 0.4) {
    flags.push({
      id: "mobile_to_web_continuity",
      severity: "medium",
      title: "Mobile captures are not continuing on web",
      detail: `${metrics.mobileToWebCount} of ${metrics.mobileCaptureCount} mobile-origin captures were continued on web.`,
      action: toAction("open-mobile-origin", "Open mobile-origin open loops", {
        target: "feed",
        lens: "open_loops"
      })
    });
  }

  if (flags.length === 0) {
    flags.push({
      id: "no_critical_risks",
      severity: "low",
      title: "No critical founder risks detected",
      detail: "Loop signals are balanced this week; keep monitoring continuation and act followthrough.",
      action: toAction("review-feed", "Open focus feed", { target: "feed", lens: "all" })
    });
  }

  return flags.slice(0, 6);
}

function nextBestMove(
  weakest: FounderReviewScore,
  flags: FounderReviewRiskFlag[]
): { title: string; detail: string; action: FounderReviewAction } {
  const strongestRisk = [...flags].sort((left, right) => {
    const severityRank = { high: 3, medium: 2, low: 1 };
    return severityRank[right.severity] - severityRank[left.severity];
  })[0];

  if (strongestRisk?.id === "weak_continue") {
    return {
      title: "Tighten continuation right after reopen",
      detail: "Push one lightweight update touch on open loops before adding new capture affordances.",
      action: strongestRisk.action
    };
  }
  if (strongestRisk?.id === "execution_dropoff") {
    return {
      title: "Improve convert-to-session handoff",
      detail: "Reduce friction between plan/task creation and immediate session start.",
      action: strongestRisk.action
    };
  }
  if (strongestRisk?.id === "blocked_work") {
    return {
      title: "Clear blocked founder queue first",
      detail: "Shrink or unblock the highest-friction items so loop trust stays intact.",
      action: strongestRisk.action
    };
  }

  return {
    title: `Strengthen ${weakest.label.toLowerCase()} next`,
    detail: `This is the weakest loop stage right now. Improve its re-entry and followthrough path first.`,
    action: weakest.action
  };
}

export function buildFounderReviewFromSignals(
  signals: FounderReviewSignals
): FounderReviewResponse {
  const metrics = buildMetrics(signals);
  const captureScore = scoreCapture(metrics);
  const resurfaceScore = scoreResurface(metrics);
  const continueScore = scoreContinue(metrics);
  const convertScore = scoreConvert(metrics);
  const actScore = scoreAct(metrics);
  const returnScore = scoreReturn(metrics);

  const loopHealth: FounderReviewScore[] = [
    makeScore("capture", "Capture", captureScore, toAction("open-capture-context", "Open all captures", { target: "feed", lens: "all" })),
    makeScore("resurface", "Resurface", resurfaceScore, toAction("open-feed-open-loops", "Open resurfaced open loops", { target: "feed", lens: "open_loops" })),
    makeScore("continue", "Continue", continueScore, toAction("open-uncontinued", "Open items opened but not updated", { target: "feed", lens: "open_loops", itemIds: metrics.continueGapItemIds.slice(0, 12) })),
    makeScore("convert", "Convert", convertScore, toAction("open-convert-candidates", "Open convert candidates", { target: "feed", lens: "in_progress" })),
    makeScore("act", "Act", actScore, toAction("open-ready-to-move", "Open ready-to-move execution", { target: "feed", executionLens: "ready_to_move" })),
    makeScore("return", "Return", returnScore, toAction("open-stale-items", "Open stale items", { target: "feed", lens: "recently_commented", itemIds: metrics.staleItemIds.slice(0, 12) }))
  ];

  const webScore = averageScore([
    scoreFromRatio(safeDivide(metrics.webCaptureCount, Math.max(metrics.captureCount, 1)), 0.1),
    scoreFromRatio(safeDivide(metrics.mobileToWebCount + metrics.webToMobileCount, Math.max(metrics.captureCount, 1)), 0.1),
    actScore
  ]);

  const mobileScore = averageScore([
    scoreFromRatio(safeDivide(metrics.mobileCaptureCount, Math.max(metrics.captureCount, 1)), 0.1),
    scoreFromRatio(safeDivide(metrics.webToMobileCount + metrics.mobileToWebCount, Math.max(metrics.captureCount, 1)), 0.08),
    continueScore
  ]);

  const mobileToWebScore = scoreFromRatio(safeDivide(metrics.mobileToWebCount, Math.max(metrics.mobileCaptureCount, 1)), 0.2);
  const webToMobileScore = scoreFromRatio(safeDivide(metrics.webToMobileCount, Math.max(metrics.webCaptureCount, 1)), 0.2);
  const feedConsistencyScore = clampScore(metrics.feedConsistencyValue * 100);
  const stateContinuityScore = clampScore(metrics.stateContinuityValue * 100);
  const crossPlatformScore = averageScore([
    mobileToWebScore,
    webToMobileScore,
    feedConsistencyScore,
    stateContinuityScore
  ]);

  const continuityStrength = averageScore([captureScore, resurfaceScore, returnScore]);
  const recognitionScore = averageScore([resurfaceScore, feedConsistencyScore]);
  const executionIntelligence = averageScore([continueScore, convertScore, actScore]);
  const emotionalUsability = averageScore([
    clampScore((1 - Math.min(1, safeDivide(metrics.feedCardsSnoozed + metrics.feedCardsDismissed, Math.max(metrics.feedCardsShown, 1)))) * 100),
    returnScore
  ]);
  const productCoherence = averageScore([
    continuityStrength,
    recognitionScore,
    executionIntelligence,
    emotionalUsability
  ]);

  const riskFlags = createRiskFlags(loopHealth, metrics);
  const weakest = weakestScore(loopHealth);
  const strongest = strongestScore(loopHealth);
  const mainRisk = [...riskFlags].sort((left, right) => {
    const severityRank = { high: 3, medium: 2, low: 1 };
    return severityRank[right.severity] - severityRank[left.severity];
  })[0];

  const suggestedFocusItem = signals.items
    .filter((item) => metrics.blockedItemIds.includes(item.id) || metrics.continueGapItemIds.includes(item.id))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  const response: FounderReviewResponse = {
    generatedAt: new Date().toISOString(),
    window: "7d",
    header: {
      title: "Founder Review",
      subtitle: "Yurbrain reflecting on loop health, continuity, and next leverage."
    },
    overview: {
      overallProduct: makeScore("overall_product", "Overall Product", productCoherence, toAction("open-overall", "Open Focus Feed", { target: "feed", lens: "all" })),
      web: makeScore("platform_web", "Web", webScore, toAction("open-web-flow", "Open web continuity lens", { target: "feed", lens: "in_progress" })),
      mobile: makeScore("platform_mobile", "Mobile", mobileScore, toAction("open-mobile-flow", "Open mobile continuity lens", { target: "feed", lens: "keep_in_mind" })),
      crossPlatform: makeScore("platform_cross", "Cross-Platform", crossPlatformScore, toAction("open-cross-platform", "Open cross-platform follow-up", { target: "feed", lens: "open_loops" }))
    },
    loopHealth,
    currentReadout: {
      strongestArea: strongest,
      weakestArea: weakest,
      mainRisk: mainRisk ?? riskFlags[0],
      recommendedNextMove: nextBestMove(weakest, riskFlags)
    },
    founderExecutionSummary: {
      activeWork: metrics.activeWork,
      blocked: metrics.blockedWork,
      stale: metrics.staleWork,
      suggestedNextFocus: suggestedFocusItem
        ? {
            title: suggestedFocusItem.title,
            reason: metrics.blockedItemIds.includes(suggestedFocusItem.id)
              ? "Blocked signal is strong; unblocking here improves execution momentum."
              : "Continuation gap is high; one update here improves loop trust.",
            action: toAction("open-suggested-focus", "Open suggested focus item", {
              target: "item",
              itemId: suggestedFocusItem.id
            })
          }
        : null
    },
    crossPlatformContinuity: {
      mobileToWeb: makeScore("mobile_to_web", "Mobile → Web", mobileToWebScore, toAction("open-mobile-to-web", "Open mobile captures not continued on web", { target: "feed", lens: "open_loops" })),
      webToMobile: makeScore("web_to_mobile", "Web → Mobile", webToMobileScore, toAction("open-web-to-mobile", "Open web captures not continued on mobile", { target: "feed", lens: "open_loops" })),
      feedConsistency: makeScore("feed_consistency", "Feed consistency", feedConsistencyScore, toAction("open-feed-consistency", "Open feed consistency view", { target: "feed", lens: "all" })),
      stateContinuity: makeScore("state_continuity", "State continuity", stateContinuityScore, toAction("open-state-continuity", "Open state continuity links", { target: "feed", lens: "in_progress" })),
      signalNote:
        "Platform continuity uses persisted source + interaction proxies (deterministic MVP) until richer per-event platform telemetry is added."
    },
    riskFlags
  };

  // These system score values are intentionally computed but not returned yet to keep the API UI-ready and lightweight.
  void continuityStrength;
  void recognitionScore;
  void executionIntelligence;
  void emotionalUsability;

  return response;
}

