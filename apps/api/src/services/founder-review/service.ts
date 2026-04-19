import type { FounderReviewQuery, FounderReviewResponse } from "../../../../../packages/contracts/src";
import type { DbRepository } from "../../../../../packages/db/src";
import { FounderReviewResponseSchema } from "../../../../../packages/contracts/src";
import { buildFounderReviewFromSignals } from "./scoring";
import { createMockFounderReviewSignals } from "./mock-signals";
import type { FounderPlatform, FounderReviewSignals } from "./types";

type BuildFounderReviewOptions = {
  repo: DbRepository;
  userId: string;
  window: FounderReviewQuery["window"];
  now?: Date;
};

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function asMs(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isWithinWindow(iso: string, windowStartMs: number): boolean {
  return asMs(iso) >= windowStartMs;
}

function sourceToPlatform(source: string | null | undefined): FounderPlatform {
  const normalized = (source ?? "").toLowerCase();
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("web")) return "web";
  return "unknown";
}

function isRelevantCard(card: Awaited<ReturnType<DbRepository["listFeedCardsByUser"]>>[number], windowStartMs: number): boolean {
  if (isWithinWindow(card.createdAt, windowStartMs)) return true;
  if (card.lastRefreshedAt && isWithinWindow(card.lastRefreshedAt, windowStartMs)) return true;
  if (card.lastPostponedAt && isWithinWindow(card.lastPostponedAt, windowStartMs)) return true;
  return false;
}

export async function collectFounderReviewSignals(options: BuildFounderReviewOptions): Promise<FounderReviewSignals> {
  const now = options.now ?? new Date();
  const windowEnd = now.toISOString();
  const windowStartMs = now.getTime() - WINDOW_MS;
  const windowStart = new Date(windowStartMs).toISOString();

  const [items, feedCards, tasks, sessions, preference] = await Promise.all([
    options.repo.listBrainItemsByUser(options.userId),
    options.repo.listFeedCardsByUser(options.userId),
    options.repo.listTasks({ userId: options.userId }),
    options.repo.listSessions({ userId: options.userId }),
    options.repo.getUserPreference(options.userId)
  ]);

  const relevantItems = items.filter((item) => isWithinWindow(item.createdAt, windowStartMs) || isWithinWindow(item.updatedAt, windowStartMs));
  const relevantItemIds = new Set(relevantItems.map((item) => item.id));
  const itemById = new Map(relevantItems.map((item) => [item.id, item]));

  const relevantTasks = tasks.filter((task) => {
    if (isWithinWindow(task.createdAt, windowStartMs) || isWithinWindow(task.updatedAt, windowStartMs)) return true;
    return Boolean(task.sourceItemId && relevantItemIds.has(task.sourceItemId));
  });
  const relevantTaskIds = new Set(relevantTasks.map((task) => task.id));

  const relevantSessions = sessions.filter((session) => {
    if (isWithinWindow(session.startedAt, windowStartMs)) return true;
    if (session.endedAt && isWithinWindow(session.endedAt, windowStartMs)) return true;
    return relevantTaskIds.has(session.taskId);
  });

  const relevantCards = feedCards.filter((card) => isRelevantCard(card, windowStartMs));
  const relevantCardItemIds = new Set(relevantCards.map((card) => card.itemId).filter((itemId): itemId is string => Boolean(itemId)));

  // Ensure item-linked cards/tasks can still be scored even when item timestamps are older.
  for (const itemId of relevantCardItemIds) {
    if (relevantItemIds.has(itemId)) continue;
    const fallback = items.find((item) => item.id === itemId);
    if (!fallback) continue;
    relevantItems.push(fallback);
    relevantItemIds.add(itemId);
    itemById.set(itemId, fallback);
  }

  const threadRows = await Promise.all(relevantItems.map((item) => options.repo.listThreads(item.id)));
  const threads = threadRows.flat();
  const relevantThreadIds = threads.map((thread) => thread.id);
  const messageRows = await Promise.all(relevantThreadIds.map((threadId) => options.repo.listMessagesByThread(threadId)));

  const messages = messageRows.flat().filter((message) => isWithinWindow(message.createdAt, windowStartMs));
  const artifactsByItem = await Promise.all(relevantItems.map((item) => options.repo.listArtifactsByItem(item.id)));
  const artifacts = artifactsByItem.flat().filter((artifact) => isWithinWindow(artifact.createdAt, windowStartMs));

  const mapped: FounderReviewSignals = {
    userId: options.userId,
    windowStart,
    windowEnd,
    items: relevantItems.map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      founderModeAtCapture: Boolean(item.founderModeAtCapture),
      platformOrigin: sourceToPlatform(item.sourceApp)
    })),
    feedCards: relevantCards.map((card) => ({
      id: card.id,
      itemId: card.itemId,
      taskId: card.taskId,
      cardType: card.cardType,
      lens: card.lens,
      createdAt: card.createdAt,
      dismissed: card.dismissed,
      postponeCount: card.postponeCount ?? 0,
      refreshCount: card.refreshCount ?? 0,
      lastPostponedAt: card.lastPostponedAt ?? null,
      lastRefreshedAt: card.lastRefreshedAt ?? null,
      // Feed contract guarantees these; DB table doesn't store them.
      hasWhyShown: true,
      hasActionability: Boolean(card.itemId || card.taskId)
    })),
    tasks: relevantTasks.map((task) => ({
      id: task.id,
      sourceItemId: task.sourceItemId,
      sourceMessageId: task.sourceMessageId,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      platformOrigin: sourceToPlatform(task.sourceItemId ? itemById.get(task.sourceItemId)?.sourceApp : null)
    })),
    sessions: relevantSessions.map((session) => ({
      id: session.id,
      taskId: session.taskId,
      state: session.state,
      startedAt: session.startedAt,
      endedAt: session.endedAt
    })),
    messages: messages.map((message) => {
      const thread = threads.find((entry) => entry.id === message.threadId);
      const sourceItem = thread ? itemById.get(thread.targetItemId) : undefined;
      return {
        id: message.id,
        itemId: thread?.targetItemId ?? "unknown-item",
        threadId: message.threadId,
        role: message.role,
        createdAt: message.createdAt,
        platform: sourceToPlatform(sourceItem?.sourceApp)
      };
    }),
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      itemId: artifact.itemId,
      type: artifact.type,
      createdAt: artifact.createdAt
    })),
    founderModeEnabled: Boolean(preference?.founderMode)
  };

  return mapped;
}

export async function buildFounderReview(options: BuildFounderReviewOptions): Promise<FounderReviewResponse> {
  const signals = await collectFounderReviewSignals(options);
  const review = buildFounderReviewFromSignals(signals);
  return FounderReviewResponseSchema.parse({
    ...review,
    generatedAt: options.now?.toISOString() ?? review.generatedAt,
    window: options.window
  });
}

export function buildFounderReviewFromMock(window: FounderReviewQuery["window"] = "7d"): FounderReviewResponse {
  const review = buildFounderReviewFromSignals(createMockFounderReviewSignals());
  return FounderReviewResponseSchema.parse({
    ...review,
    window
  });
}
