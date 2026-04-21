import type {
  FounderReviewAction,
  FounderReviewDiagnosticsResponse,
  FounderReviewQuery,
  FounderReviewResponse
} from "@yurbrain/contracts";
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

type FounderReviewFunctionDiagnostics = FounderReviewDiagnosticsResponse;

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
  const latestItems = [...signals.items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
  const latestItemTitles = latestItems.map((item) => item.title);
  const staleThresholdMs = 72 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const itemAction = (
    id: string,
    label: string,
    input: Partial<FounderReviewAction> = {}
  ): FounderReviewAction => ({
    id,
    label,
    target: input.target ?? "item",
    lens: input.lens,
    executionLens: input.executionLens,
    itemId: input.itemId,
    itemIds: input.itemIds
  });

  const blockedItemIds = new Set(
    signals.feedCards
      .filter((card) => card.postponeCount >= 2 && card.itemId)
      .map((card) => card.itemId as string)
  );
  for (const task of signals.tasks) {
    if (task.status === "todo" && task.sourceItemId) {
      blockedItemIds.add(task.sourceItemId);
    }
  }

  const continueGapItemIds = new Set(
    signals.items
      .filter((item) => {
        const hasTouch = signals.messages.some((message) => message.itemId === item.id);
        const hasTask = signals.tasks.some((task) => task.sourceItemId === item.id);
        return !hasTouch && !hasTask;
      })
      .map((item) => item.id)
  );

  const staleItemIds = new Set(
    signals.items
      .filter((item) => nowMs - new Date(item.updatedAt).getTime() > staleThresholdMs)
      .map((item) => item.id)
  );

  const rankedFocusItems = [...signals.items]
    .map((item) => {
      const blocked = blockedItemIds.has(item.id);
      const continueGap = continueGapItemIds.has(item.id);
      const stale = staleItemIds.has(item.id);
      const score = Number(blocked) * 3 + Number(continueGap) * 2 + Number(stale);
      return {
        item,
        blocked,
        continueGap,
        stale,
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.item.updatedAt.localeCompare(left.item.updatedAt))
    .slice(0, 8)
    .map((entry) => {
      const reasons: string[] = [];
      if (entry.blocked) reasons.push("Blocked signals accumulating");
      if (entry.continueGap) reasons.push("No continuation touch yet");
      if (entry.stale) reasons.push("No meaningful update for 72h+");
      const reasonCode = entry.blocked
        ? "blocked"
        : entry.continueGap
          ? "continuation_gap"
          : entry.stale
            ? "stale"
            : "recent_signal";
      return {
        itemId: entry.item.id,
        title: entry.item.title,
        reason: reasonCode,
        detail: reasons.join(" · "),
        action: itemAction("founder-diagnostics-open-item", "Open item detail for focused follow-up", {
          target: "item",
          itemId: entry.item.id
        })
      };
    });

  const focusActions: FounderReviewAction[] = [
    itemAction("founder-diagnostics-open-loops", "Open open loops with founder context", {
      target: "feed",
      lens: "open_loops",
      itemIds: [...continueGapItemIds].slice(0, 24)
    }),
    itemAction("founder-diagnostics-open-needs-unblock", "Open blocked execution lens", {
      target: "feed",
      executionLens: "needs_unblock",
      itemIds: [...blockedItemIds].slice(0, 24)
    }),
    itemAction("founder-diagnostics-open-stale", "Open stale continuity candidates", {
      target: "feed",
      lens: "recently_commented",
      itemIds: [...staleItemIds].slice(0, 24)
    })
  ];

  return {
    strongestKeywords,
    latestItemTitles,
    itemCount: signals.items.length,
    taskCount: signals.tasks.length,
    sessionCount: signals.sessions.length,
    focusItems: rankedFocusItems,
    focusActions
  };
}
