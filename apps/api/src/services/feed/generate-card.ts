import { randomUUID } from "node:crypto";

import type { StoredFeedCard } from "./static-feed";

export type FeedSourceItem = {
  id: string;
  userId: string;
  title: string;
  rawContent: string;
  execution?: {
    status: "none" | "candidate" | "planned" | "in_progress" | "blocked" | "done";
  };
  createdAt: string;
};

const lensCycle: StoredFeedCard["lens"][] = ["keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"];

export function generateCardFromItem(item: FeedSourceItem): StoredFeedCard {
  let lens = lensCycle[item.title.length % lensCycle.length] ?? "keep_in_mind";
  if (item.execution?.status === "in_progress" || item.execution?.status === "done" || item.execution?.status === "planned") {
    lens = "in_progress";
  } else if (item.execution?.status === "blocked") {
    lens = "open_loops";
  }

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
    lastRefreshedAt: null,
    createdAt: item.createdAt
  };
}

function summarizeRawContent(rawContent: string): string {
  const normalized = rawContent.trim().replace(/\s+/g, " ");
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157)}...`;
}
