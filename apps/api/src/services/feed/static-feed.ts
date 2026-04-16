export type StoredFeedCard = {
  id: string;
  userId: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
  itemId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil?: string | null;
  refreshCount?: number;
  postponeCount?: number;
  relatedCount?: number | null;
  lastPostponedAt?: string | null;
  lastRefreshedAt?: string | null;
  lastTouched?: string | null;
  createdAt: string;
};

export type FeedWhyShown = {
  summary: string;
  reasons: string[];
};

export type FeedCardResponse = StoredFeedCard & {
  snoozedUntil: string | null;
  refreshCount: number;
  postponeCount: number;
  relatedCount: number | null;
  lastPostponedAt: string | null;
  lastRefreshedAt: string | null;
  lastTouched: string | null;
  availableActions: Array<"open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh">;
  stateFlags: {
    dismissed: boolean;
    snoozed: boolean;
    actionable: boolean;
    hasSourceItem: boolean;
    hasSourceTask: boolean;
  };
  whyShown: FeedWhyShown;
  whyShownText: string;
};

export function isCardSnoozed(card: StoredFeedCard, now = new Date()): boolean {
  return Boolean(card.snoozedUntil && new Date(card.snoozedUntil).getTime() > now.getTime());
}

export function toFeedCardResponse(card: StoredFeedCard, whyShown: FeedWhyShown): FeedCardResponse {
  const snoozedUntil = card.snoozedUntil ?? null;
  const hasSourceItem = Boolean(card.itemId);
  const hasSourceTask = Boolean(card.taskId);
  const availableActions: FeedCardResponse["availableActions"] =
    card.cardType === "cluster" ? ["open_item", "convert_to_task", "dismiss", "refresh"] : ["dismiss", "snooze", "refresh"];
  if (card.cardType !== "cluster") {
    if (hasSourceItem) {
      availableActions.unshift("open_item", "comment", "ask_ai", "convert_to_task");
    }
    if (hasSourceTask) {
      availableActions.unshift("open_task", "start_session");
    }
  }

  return {
    ...card,
    snoozedUntil,
    refreshCount: card.refreshCount ?? 0,
    postponeCount: card.postponeCount ?? 0,
    relatedCount: card.relatedCount ?? null,
    lastPostponedAt: card.lastPostponedAt ?? null,
    lastRefreshedAt: card.lastRefreshedAt ?? null,
    lastTouched: card.lastTouched ?? null,
    availableActions,
    stateFlags: {
      dismissed: card.dismissed,
      snoozed: isCardSnoozed(card),
      actionable: hasSourceItem || hasSourceTask,
      hasSourceItem,
      hasSourceTask
    },
    whyShown,
    whyShownText: whyShown.summary
  };
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
