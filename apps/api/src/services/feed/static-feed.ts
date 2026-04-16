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
  lastPostponedAt?: string | null;
  lastRefreshedAt?: string | null;
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
  lastPostponedAt: string | null;
  lastRefreshedAt: string | null;
  availableActions: Array<"open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh">;
  stateFlags: {
    dismissed: boolean;
    snoozed: boolean;
    actionable: boolean;
    hasSourceItem: boolean;
    hasSourceTask: boolean;
  };
  whyShown: FeedWhyShown;
  relatedCount: number | null;
  clusterTopic: string | null;
  clusterItemIds: string[] | null;
  lastTouched: string | null;
};

export type FeedCardMeta = {
  relatedCount?: number | null;
  clusterTopic?: string | null;
  clusterItemIds?: string[] | null;
  lastTouched?: string | null;
};

export function isCardSnoozed(card: StoredFeedCard, now = new Date()): boolean {
  return Boolean(card.snoozedUntil && new Date(card.snoozedUntil).getTime() > now.getTime());
}

export function toFeedCardResponse(card: StoredFeedCard, whyShown: FeedWhyShown, meta: FeedCardMeta = {}): FeedCardResponse {
  const snoozedUntil = card.snoozedUntil ?? null;
  const hasSourceItem = Boolean(card.itemId);
  const hasSourceTask = Boolean(card.taskId);
  const availableActions: FeedCardResponse["availableActions"] = ["dismiss", "snooze", "refresh"];
  if (hasSourceItem) {
    availableActions.unshift("open_item", "comment", "ask_ai", "convert_to_task");
  }
  if (hasSourceTask) {
    availableActions.unshift("open_task", "start_session");
  }

  return {
    ...card,
    snoozedUntil,
    refreshCount: card.refreshCount ?? 0,
    postponeCount: card.postponeCount ?? 0,
    lastPostponedAt: card.lastPostponedAt ?? null,
    lastRefreshedAt: card.lastRefreshedAt ?? null,
    availableActions,
    stateFlags: {
      dismissed: card.dismissed,
      snoozed: isCardSnoozed(card),
      actionable: hasSourceItem || hasSourceTask,
      hasSourceItem,
      hasSourceTask
    },
    whyShown,
    relatedCount: meta.relatedCount ?? null,
    clusterTopic: meta.clusterTopic ?? null,
    clusterItemIds: meta.clusterItemIds ?? null,
    lastTouched: meta.lastTouched ?? card.lastRefreshedAt ?? card.lastPostponedAt ?? card.createdAt
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
