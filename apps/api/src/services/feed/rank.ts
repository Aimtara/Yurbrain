import type { FeedWhyShown, StoredFeedCard } from "./static-feed";

type RankOptions = {
  lens?: StoredFeedCard["lens"];
  now?: Date;
};

type BaseScore = {
  card: StoredFeedCard;
  ageHours: number;
  recencyScore: number;
  lensMatchBoost: number;
  actionabilityBoost: number;
  continuityBoost: number;
  refreshPenalty: number;
  postponePenalty: number;
  stalePenalty: number;
  baseScore: number;
};

type ScoreBreakdown = BaseScore & {
  typeDiversityPenalty: number;
  lensDiversityPenalty: number;
  finalScore: number;
};

export type RankedFeedCard = {
  card: StoredFeedCard;
  score: number;
  whyShown: FeedWhyShown;
};

const ACTIONABLE_CARD_TYPES: ReadonlySet<StoredFeedCard["cardType"]> = new Set(["open_loop", "opportunity", "resume"]);

const lensLabels: Record<StoredFeedCard["lens"], string> = {
  all: "All",
  keep_in_mind: "Keep in mind",
  open_loops: "Open loops",
  learning: "Learning",
  in_progress: "In progress",
  recently_commented: "Recently commented"
};

const cardTypeLabels: Record<StoredFeedCard["cardType"], string> = {
  item: "Memory",
  digest: "Digest",
  cluster: "Cluster",
  opportunity: "Opportunity",
  open_loop: "Open loop",
  resume: "Resume point"
};

export function rankFeedCards(cards: StoredFeedCard[], options: RankOptions = {}): RankedFeedCard[] {
  const now = options.now ?? new Date();
  const requestedLens = options.lens ?? "all";
  const remaining = cards.map((card) => scoreCard(card, requestedLens, now));
  const selectedTypeCounts: Partial<Record<StoredFeedCard["cardType"], number>> = {};
  const selectedLensCounts: Partial<Record<StoredFeedCard["lens"], number>> = {};
  const ranked: RankedFeedCard[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = applyDiversityPenalty(remaining[0], selectedTypeCounts, selectedLensCounts, requestedLens);

    for (let index = 1; index < remaining.length; index += 1) {
      const contenderScore = applyDiversityPenalty(remaining[index], selectedTypeCounts, selectedLensCounts, requestedLens);
      if (isHigherRank(contenderScore, bestScore)) {
        bestIndex = index;
        bestScore = contenderScore;
      }
    }

    const [selected] = remaining.splice(bestIndex, 1);
    selectedTypeCounts[selected.card.cardType] = (selectedTypeCounts[selected.card.cardType] ?? 0) + 1;
    selectedLensCounts[selected.card.lens] = (selectedLensCounts[selected.card.lens] ?? 0) + 1;

    ranked.push({
      card: selected.card,
      score: bestScore.finalScore,
      whyShown: buildWhyShown(bestScore, requestedLens, now)
    });
  }

  return ranked;
}

function scoreCard(card: StoredFeedCard, requestedLens: StoredFeedCard["lens"], now: Date): BaseScore {
  const ageHours = Math.max(0, (now.getTime() - new Date(card.createdAt).getTime()) / 3_600_000);
  const recencyScore = Math.max(0, 72 - ageHours);
  const lensMatchBoost = requestedLens !== "all" && card.lens === requestedLens ? 24 : 0;
  const actionabilityBoost = ACTIONABLE_CARD_TYPES.has(card.cardType) ? 8 : 0;
  const continuityBoost = scoreContinuity(card, now);
  const refreshPenalty = Math.min((card.refreshCount ?? 0) * 4, 16);
  const postponePenalty = Math.min((card.postponeCount ?? 0) * 3, 18);
  const stalePenalty = ageHours > 72 ? Math.min(12, Math.floor((ageHours - 72) / 24) * 2 + 2) : 0;
  const baseScore = recencyScore + lensMatchBoost + actionabilityBoost + continuityBoost - refreshPenalty - postponePenalty - stalePenalty;

  return {
    card,
    ageHours,
    recencyScore,
    lensMatchBoost,
    actionabilityBoost,
    continuityBoost,
    refreshPenalty,
    postponePenalty,
    stalePenalty,
    baseScore
  };
}

function scoreContinuity(card: StoredFeedCard, now: Date): number {
  if (!card.lastRefreshedAt) return 0;

  const refreshedAtMs = new Date(card.lastRefreshedAt).getTime();
  if (!Number.isFinite(refreshedAtMs)) return 0;

  const hoursSinceRefresh = Math.max(0, (now.getTime() - refreshedAtMs) / 3_600_000);
  const refreshCount = card.refreshCount ?? 0;
  if (refreshCount > 2) return 0;

  if (hoursSinceRefresh <= 24) return 6;
  if (hoursSinceRefresh <= 72) return 3;
  return 0;
}
function applyDiversityPenalty(
  base: BaseScore,
  selectedTypeCounts: Partial<Record<StoredFeedCard["cardType"], number>>,
  selectedLensCounts: Partial<Record<StoredFeedCard["lens"], number>>,
  requestedLens: StoredFeedCard["lens"]
): ScoreBreakdown {
  const typeDiversityPenalty = (selectedTypeCounts[base.card.cardType] ?? 0) * 10;
  const lensDiversityPenalty = requestedLens === "all" ? (selectedLensCounts[base.card.lens] ?? 0) * 3 : 0;

  return {
    ...base,
    typeDiversityPenalty,
    lensDiversityPenalty,
    finalScore: base.baseScore - typeDiversityPenalty - lensDiversityPenalty
  };
}

function isHigherRank(candidate: ScoreBreakdown, currentBest: ScoreBreakdown): boolean {
  if (candidate.finalScore !== currentBest.finalScore) {
    return candidate.finalScore > currentBest.finalScore;
  }
  if (candidate.card.createdAt !== currentBest.card.createdAt) {
    return candidate.card.createdAt > currentBest.card.createdAt;
  }
  return candidate.card.id.localeCompare(currentBest.card.id) < 0;
}

function buildWhyShown(score: ScoreBreakdown, requestedLens: StoredFeedCard["lens"], now: Date): FeedWhyShown {
  const reasons: string[] = [];
  const refreshedAgeHours = getAgeHours(score.card.lastRefreshedAt, now);
  const postponedAgeHours = getAgeHours(score.card.lastPostponedAt ?? undefined, now);

  if (score.continuityBoost > 0 && refreshedAgeHours !== null) {
    reasons.push(`You revisited this ${formatRelativeAge(refreshedAgeHours)}, so it stays easy to resume.`);
  }

  if (requestedLens !== "all" && score.card.lens === requestedLens) {
    reasons.push(`Fits your ${lensLabels[requestedLens]} lens right now.`);
  }

  if (score.card.taskId) {
    reasons.push("Linked to a task already in motion.");
  }

  if (score.ageHours <= 24) {
    reasons.push(`Captured ${formatRelativeAge(score.ageHours)}, so the context is still fresh.`);
  } else if (score.ageHours <= 72) {
    reasons.push(`Captured ${formatRelativeAge(score.ageHours)} and still worth a quick revisit.`);
  }

  if (score.actionabilityBoost > 0) {
    reasons.push(`${cardTypeLabels[score.card.cardType]} cards usually have a light next step.`);
  }

  if ((score.card.postponeCount ?? 0) > 0) {
    const count = score.card.postponeCount ?? 0;
    const postponedSuffix = postponedAgeHours === null ? "" : ` (last ${formatRelativeAge(postponedAgeHours)})`;
    reasons.push(`You snoozed this ${count === 1 ? "once" : `${count} times`}${postponedSuffix}, so it resurfaces gently.`);
  }

  if (requestedLens === "all" && score.typeDiversityPenalty === 0) {
    reasons.push("Added to keep your feed varied, not repetitive.");
  }

  if (reasons.length === 0) {
    reasons.push("Back now because recency and feed balance both point to it.");
  }

  const uniqueReasons = Array.from(new Set(reasons)).map((reason) => clampReasonLength(reason));
  const summary = uniqueReasons[0] ?? clampReasonLength("Back now to keep your thinking thread continuous.");
  return {
    summary,
    reasons: uniqueReasons.slice(0, 3)
  };
}

function formatRelativeAge(ageHours: number): string {
  if (ageHours < 1) return "less than an hour ago";
  if (ageHours < 24) return `${Math.max(1, Math.floor(ageHours))}h ago`;
  const days = Math.floor(ageHours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function getAgeHours(isoValue: string | undefined | null, now: Date): number | null {
  if (!isoValue) return null;
  const parsed = new Date(isoValue).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, (now.getTime() - parsed) / 3_600_000);
}

function clampReasonLength(reason: string): string {
  if (reason.length <= 160) return reason;
  return `${reason.slice(0, 157).trimEnd()}...`;
}
