import type { StoredFeedCard } from "./static-feed";
import { isCardSnoozed } from "./static-feed";

export type FeedCandidateOptions = {
  userId?: string;
  lens?: StoredFeedCard["lens"];
  includeSnoozed?: boolean;
  now?: Date;
};

export function gatherFeedCandidates(cards: Iterable<StoredFeedCard>, options: FeedCandidateOptions): StoredFeedCard[] {
  const now = options.now ?? new Date();

  return Array.from(cards)
    .filter((card) => !card.dismissed)
    .filter((card) => !options.userId || card.userId === options.userId)
    .filter((card) => options.includeSnoozed || !isCardSnoozed(card, now))
    .filter((card) => !options.lens || options.lens === "all" || card.lens === options.lens)
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
      return b.createdAt.localeCompare(a.createdAt);
    });
}
