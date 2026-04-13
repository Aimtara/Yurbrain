import type { StoredFeedCard } from "./static-feed";

type RankOptions = {
  lens?: StoredFeedCard["lens"];
  now?: Date;
};

export function rankFeedCards(cards: StoredFeedCard[], options: RankOptions = {}): StoredFeedCard[] {
  const now = options.now ?? new Date();
  const typeCounts = countCardTypes(cards);

  return [...cards].sort((a, b) => {
    const scoreA = scoreCard(a, typeCounts.get(a.cardType) ?? 0, options.lens, now);
    const scoreB = scoreCard(b, typeCounts.get(b.cardType) ?? 0, options.lens, now);

    if (scoreA === scoreB) {
      if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
      return b.createdAt.localeCompare(a.createdAt);
    }

    return scoreB - scoreA;
  });
}

function scoreCard(card: StoredFeedCard, totalTypeCount: number, lens: StoredFeedCard["lens"] | undefined, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - new Date(card.createdAt).getTime()) / 3_600_000);
  const recencyScore = Math.max(0, 100 - ageHours);
  const lensBoost = lens && lens !== "all" && card.lens === lens ? 25 : 0;
  const diversityPenalty = Math.max(0, totalTypeCount - 1) * 2;
  const refreshBoost = Math.min(card.refreshCount ?? 0, 3);

  return recencyScore + lensBoost + refreshBoost - diversityPenalty;
}

function countCardTypes(cards: StoredFeedCard[]): Map<StoredFeedCard["cardType"], number> {
  const counts = new Map<StoredFeedCard["cardType"], number>();
  for (const card of cards) {
    counts.set(card.cardType, (counts.get(card.cardType) ?? 0) + 1);
  }
  return counts;
}
