import type { StoredFeedCard } from "./static-feed";
import { isCardSnoozed } from "./static-feed";

export type FeedCandidateOptions = {
  userId?: string;
  lens?: StoredFeedCard["lens"];
  executionLens?: "all" | "ready_to_move" | "needs_unblock" | "momentum";
  includeSnoozed?: boolean;
  itemExecutionStatusById?: (itemId: string) => "none" | "candidate" | "planned" | "in_progress" | "blocked" | "done" | undefined;
  taskStatusById?: (taskId: string) => "todo" | "in_progress" | "done" | undefined;
  now?: Date;
};

function matchesExecutionLens(
  card: StoredFeedCard,
  executionLens: "all" | "ready_to_move" | "needs_unblock" | "momentum",
  options: FeedCandidateOptions
): boolean {
  if (executionLens === "all") return true;
  const itemStatus = card.itemId ? options.itemExecutionStatusById?.(card.itemId) : undefined;
  const taskStatus = card.taskId ? options.taskStatusById?.(card.taskId) : undefined;

  if (executionLens === "ready_to_move") {
    return taskStatus === "todo" || card.cardType === "resume" || itemStatus === "candidate" || itemStatus === "planned";
  }

  if (executionLens === "needs_unblock") {
    return itemStatus === "blocked";
  }

  return taskStatus === "in_progress" || taskStatus === "done" || itemStatus === "in_progress" || itemStatus === "done";
}

export function gatherFeedCandidates(cards: Iterable<StoredFeedCard>, options: FeedCandidateOptions): StoredFeedCard[] {
  const now = options.now ?? new Date();

  return Array.from(cards)
    .filter((card) => !card.dismissed)
    .filter((card) => !options.userId || card.userId === options.userId)
    .filter((card) => options.includeSnoozed || !isCardSnoozed(card, now))
    .filter((card) => !options.lens || options.lens === "all" || card.lens === options.lens)
    .filter((card) => !options.executionLens || matchesExecutionLens(card, options.executionLens, options))
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
      return b.createdAt.localeCompare(a.createdAt);
    });
}
