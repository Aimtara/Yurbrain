export type StoredFeedCard = {
  id: string;
  userId: string;
  title: string;
  body: string;
  dismissed: boolean;
  createdAt: string;
};

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
