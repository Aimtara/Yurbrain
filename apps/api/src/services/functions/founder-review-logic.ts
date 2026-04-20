import type { FounderReviewQuery, FounderReviewResponse } from "@yurbrain/contracts";
import type { DbRepository } from "@yurbrain/db";
import {
  buildFounderReview,
  collectFounderReviewSignals
} from "../founder-review/service";

export type FounderReviewFunctionInput = {
  userId: string;
  window: FounderReviewQuery["window"];
  includeAi?: boolean;
};

export type FounderReviewFunctionDiagnostics = {
  strongestKeywords: string[];
  latestItemTitles: string[];
  itemCount: number;
  taskCount: number;
  sessionCount: number;
};

type FounderReviewFunctionOptions = {
  repo: DbRepository;
  userId: string;
  window: FounderReviewQuery["window"];
  includeAi?: boolean;
};

export async function buildFounderReviewForFunction(
  options: FounderReviewFunctionOptions
): Promise<FounderReviewResponse> {
  return buildFounderReview({
    repo: options.repo,
    userId: options.userId,
    window: options.window,
    now: new Date(),
    includeAi: options.includeAi
  });
}

export async function buildFounderReviewDiagnostics(
  options: FounderReviewFunctionOptions
): Promise<FounderReviewFunctionDiagnostics> {
  const signals = await collectFounderReviewSignals({
    repo: options.repo,
    userId: options.userId,
    window: options.window,
    now: new Date(),
    includeAi: options.includeAi
  });
  const keywordCounts = new Map<string, number>();
  for (const item of signals.items) {
    const tokens = `${item.title}`.toLowerCase().split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (token.length < 4) continue;
      keywordCounts.set(token, (keywordCounts.get(token) ?? 0) + 1);
    }
  }
  const strongestKeywords = [...keywordCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([token]) => token);
  const latestItemTitles = [...signals.items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4)
    .map((item) => item.title);
  return {
    strongestKeywords,
    latestItemTitles,
    itemCount: signals.items.length,
    taskCount: signals.tasks.length,
    sessionCount: signals.sessions.length
  };
}
