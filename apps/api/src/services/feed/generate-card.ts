import { randomUUID } from "node:crypto";

import type { StoredFeedCard } from "./static-feed";

export type FeedSourceItem = {
  id: string;
  userId: string;
  title: string;
  rawContent: string;
  createdAt: string;
};

const lensCycle: StoredFeedCard["lens"][] = ["keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"];

export function generateCardFromItem(item: FeedSourceItem): StoredFeedCard {
  const lens = lensCycle[item.title.length % lensCycle.length] ?? "keep_in_mind";

  return {
    id: randomUUID(),
    userId: item.userId,
    cardType: "item",
    lens,
    itemId: item.id,
    taskId: null,
    title: item.title,
    body: summarizeRawContent(item.rawContent),
    dismissed: false,
    snoozedUntil: null,
    refreshCount: 0,
    postponeCount: 0,
    lastPostponedAt: null,
    lastRefreshedAt: null,
    createdAt: item.createdAt
  };
}

function summarizeRawContent(rawContent: string): string {
  const normalized = rawContent.trim().replace(/\s+/g, " ");
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157)}...`;
}
