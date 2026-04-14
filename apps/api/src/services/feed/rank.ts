import type { FeedWhyShown, StoredFeedCard } from "./static-feed";

type RankOptions = {
  lens?: StoredFeedCard["lens"];
  now?: Date;
};

type BaseScore = {
  card: StoredFeedCard;
  recencyScore: number;
  lensMatchBoost: number;
  actionabilityBoost: number;
  continuityBoost: number;
  refreshPenalty: number;
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
      whyShown: buildWhyShown(bestScore, requestedLens)
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
  const stalePenalty = ageHours > 72 ? Math.min(12, Math.floor((ageHours - 72) / 24) * 2 + 2) : 0;
  const baseScore = recencyScore + lensMatchBoost + actionabilityBoost + continuityBoost - refreshPenalty - stalePenalty;

  return {
    card,
    recencyScore,
    lensMatchBoost,
    actionabilityBoost,
    continuityBoost,
    refreshPenalty,
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

function buildWhyShown(score: ScoreBreakdown, requestedLens: StoredFeedCard["lens"]): FeedWhyShown {
  const reasons: string[] = [];

  if (requestedLens !== "all" && score.card.lens === requestedLens) {
    reasons.push(`Matches your ${lensLabels[requestedLens]} lens.`);
  }

  if (score.recencyScore >= 48) {
    reasons.push("Recent activity makes this relevant right now.");
  } else if (score.recencyScore >= 24) {
    reasons.push("Still fresh enough to be useful.");
  }

  if (score.actionabilityBoost > 0) {
    reasons.push("Action-oriented card to maintain momentum.");
  }

  if (score.continuityBoost > 0) {
    reasons.push("Keeps continuity with something you recently revisited.");
  }

  if (requestedLens === "all" && score.typeDiversityPenalty === 0) {
    reasons.push("Adds variety to keep this feed from feeling repetitive.");
  }

  if (reasons.length === 0) {
    reasons.push("Selected for a balance of relevance and feed quality.");
  }

  const summary = reasons[0];
  return {
    summary,
    reasons: [summary, ...reasons.slice(1, 3)]
  };
}
