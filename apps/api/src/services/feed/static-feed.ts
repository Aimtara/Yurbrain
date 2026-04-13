export type StoredFeedCard = {
  id: string;
  userId: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
  itemId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil?: string | null;
  refreshCount?: number;
  lastRefreshedAt?: string | null;
  createdAt: string;
};

export function isCardSnoozed(card: StoredFeedCard, now = new Date()): boolean {
  return Boolean(card.snoozedUntil && new Date(card.snoozedUntil).getTime() > now.getTime());
}

export function getDeterministicFeed(cards: Iterable<StoredFeedCard>, userId?: string): StoredFeedCard[] {
  return Array.from(cards)
    .filter((card) => !card.dismissed)
    .filter((card) => !userId || card.userId === userId)
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return a.id.localeCompare(b.id);
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
}
