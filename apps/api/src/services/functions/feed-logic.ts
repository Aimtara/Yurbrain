import { randomUUID } from "node:crypto";
import { FeedCardSchema } from "@yurbrain/contracts";
import { canAccessUser, type CurrentUserContext } from "../../middleware/current-user";
import { generateCardFromItem } from "../feed/generate-card";
import { rankFeedCards } from "../feed/rank";
import type { FeedCardMeta, FeedWhyShown, StoredFeedCard } from "../feed/static-feed";
import { toFeedCardResponse } from "../feed/static-feed";
import type { AppState, BrainItemRecord } from "../../state";
import { gatherFeedCandidates as gatherCandidates } from "../feed/candidates";

const CLUSTER_THRESHOLD = 3;
const CLUSTER_WINDOW_DAYS = 14;

type ClusterSnapshot = {
  topic: string;
  itemIds: string[];
  itemCount: number;
  lastTouched: string;
  title: string;
  body: string;
};

type RankedFeedInput = {
  lens?: StoredFeedCard["lens"];
  includeSnoozed?: boolean;
  limit?: number;
};

export function parseFunctionFeedInput(input: RankedFeedInput): RankedFeedInput {
  return {
    lens: input.lens,
    includeSnoozed: input.includeSnoozed,
    limit: input.limit
  };
}

const generatedCardWhyShown: FeedWhyShown = {
  summary: "Based on one of your saved memories.",
  reasons: [
    "Based on one of your saved memories.",
    "Kept visible so you can quickly pick up the thread."
  ]
};

function parseLimit(value?: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(Math.trunc(value as number), 50));
}

function parseSnoozeMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(5, Math.min(Math.trunc(value), 60 * 24 * 7));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return Math.max(5, Math.min(parsed, 60 * 24 * 7));
    }
  }
  return 60;
}

function toFeedCardContract(card: StoredFeedCard, whyShown: FeedWhyShown, meta: FeedCardMeta = {}) {
  return FeedCardSchema.parse(toFeedCardResponse(card, whyShown, meta));
}

function normalizeTopic(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isWithinDays(isoDate: string, now: Date, days: number): boolean {
  const parsed = new Date(isoDate).getTime();
  if (!Number.isFinite(parsed)) return false;
  return now.getTime() - parsed <= days * 24 * 3_600_000;
}

function inferLastTouched(item: BrainItemRecord): string {
  return item.updatedAt || item.createdAt;
}

function summarizeClusterBody(items: BrainItemRecord[]): string {
  const labels = items.map((item) => item.title).filter(Boolean).slice(0, 3);
  if (labels.length === 0) return "Related captures grouped together for one-pass review.";
  if (labels.length === 1) return `Connected to "${labels[0]}".`;
  if (labels.length === 2) return `Connected themes: "${labels[0]}" and "${labels[1]}".`;
  return `Connected themes: "${labels[0]}", "${labels[1]}", and "${labels[2]}".`;
}

function buildClusterSnapshots(items: BrainItemRecord[], now: Date): ClusterSnapshot[] {
  const grouped = new Map<string, BrainItemRecord[]>();
  for (const item of items) {
    const topic = normalizeTopic(item.topicGuess);
    if (!topic) continue;
    if (!isWithinDays(item.createdAt, now, CLUSTER_WINDOW_DAYS)) continue;
    const bucket = grouped.get(topic) ?? [];
    bucket.push(item);
    grouped.set(topic, bucket);
  }

  return [...grouped.entries()]
    .map(([topic, clusterItems]) => {
      const sorted = [...clusterItems].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const latest = sorted[0];
      if (!latest) return null;
      return {
        topic,
        itemIds: sorted.map((item) => item.id),
        itemCount: sorted.length,
        lastTouched: inferLastTouched(latest),
        title: `Cluster: ${topic}`,
        body: summarizeClusterBody(sorted)
      };
    })
    .filter((snapshot): snapshot is ClusterSnapshot => snapshot !== null)
    .filter((snapshot) => snapshot.itemCount >= CLUSTER_THRESHOLD)
    .sort((left, right) => right.lastTouched.localeCompare(left.lastTouched));
}

async function ensureClusterCards(
  state: AppState,
  userId: string,
  existingCards: StoredFeedCard[],
  clusters: ClusterSnapshot[],
  nowIso: string
) {
  for (const cluster of clusters) {
    const alreadyExists = existingCards.some((card) => card.cardType === "cluster" && card.title === cluster.title);
    if (alreadyExists) continue;
    await state.repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "cluster",
      lens: "keep_in_mind",
      itemId: cluster.itemIds[0] ?? null,
      taskId: null,
      title: cluster.title,
      body: cluster.body,
      dismissed: false,
      snoozedUntil: null,
      refreshCount: 0,
      postponeCount: 0,
      lastPostponedAt: null,
      lastRefreshedAt: null,
      createdAt: nowIso
    });
  }
}

function buildFeedMeta(
  card: StoredFeedCard,
  itemById: Map<string, BrainItemRecord>,
  clusterByTopic: Map<string, ClusterSnapshot>,
  clusterByTitle: Map<string, ClusterSnapshot>
): FeedCardMeta {
  if (card.cardType === "cluster") {
    const cluster = clusterByTitle.get(card.title);
    return {
      relatedCount: cluster?.itemCount ?? null,
      clusterTopic: cluster?.topic ?? null,
      clusterItemIds: cluster?.itemIds ?? null,
      lastTouched: cluster?.lastTouched ?? card.lastRefreshedAt ?? card.createdAt
    };
  }

  if (!card.itemId) {
    return {
      relatedCount: null,
      clusterTopic: null,
      clusterItemIds: null,
      lastTouched: card.lastRefreshedAt ?? card.lastPostponedAt ?? card.createdAt
    };
  }

  const sourceItem = itemById.get(card.itemId);
  const topic = normalizeTopic(sourceItem?.topicGuess);
  const cluster = topic ? clusterByTopic.get(topic) : undefined;
  return {
    relatedCount: cluster ? Math.max(0, cluster.itemCount - 1) : null,
    clusterTopic: topic,
    clusterItemIds: cluster?.itemIds ?? null,
    lastTouched: sourceItem ? inferLastTouched(sourceItem) : card.lastRefreshedAt ?? card.createdAt
  };
}

export async function rankFeedForUser(
  state: AppState,
  currentUser: CurrentUserContext,
  input: RankedFeedInput = {}
) {
  const userId = currentUser.id;
  let clusterByTopic = new Map<string, ClusterSnapshot>();
  let clusterByTitle = new Map<string, ClusterSnapshot>();
  let itemById = new Map<string, BrainItemRecord>();

  const userItems = await state.repo.listBrainItemsByUser(userId);
  itemById = new Map(userItems.map((item) => [item.id, item]));
  const existingCards = await state.repo.listFeedCardsByUser(userId);
  if (existingCards.length === 0) {
    const generated = userItems.map((item) => generateCardFromItem(item));
    for (const card of generated) {
      await state.repo.createFeedCard(card);
    }
  }

  const clusters = buildClusterSnapshots(userItems, new Date());
  clusterByTopic = new Map(clusters.map((cluster) => [cluster.topic, cluster]));
  clusterByTitle = new Map(clusters.map((cluster) => [cluster.title, cluster]));
  await ensureClusterCards(state, userId, existingCards, clusters, new Date().toISOString());

  const cards = await state.repo.listFeedCardsByUser(userId);
  const promotedTopics = new Set(clusterByTopic.keys());
  const cardsWithClusterSuppression = cards.filter((card) => {
    if (card.cardType !== "item") return true;
    if (!card.itemId) return true;
    const sourceItem = itemById.get(card.itemId);
    const topic = normalizeTopic(sourceItem?.topicGuess);
    if (!topic) return true;
    return !promotedTopics.has(topic);
  });

  const candidates = gatherCandidates(cardsWithClusterSuppression, {
    userId,
    lens: input.lens,
    includeSnoozed: input.includeSnoozed ?? false
  });
  const ranked = rankFeedCards(candidates, { lens: input.lens });
  return ranked
    .slice(0, parseLimit(input.limit))
    .map((rankedCard) =>
      toFeedCardContract(rankedCard.card, rankedCard.whyShown, buildFeedMeta(rankedCard.card, itemById, clusterByTopic, clusterByTitle))
    );
}

export async function buildFunctionFeed(
  state: AppState,
  userId: string,
  input: RankedFeedInput = {}
) {
  const cards = await rankFeedForUser(
    state,
    {
      id: userId,
      source: "header"
    },
    input
  );
  return { cards };
}

export async function dismissFeedCardForUser(state: AppState, currentUser: CurrentUserContext, cardId: string) {
  const card = await state.repo.getFeedCardById(cardId);
  if (!card || !canAccessUser(currentUser, card.userId)) {
    return null;
  }
  await state.repo.updateFeedCard(cardId, { dismissed: true, snoozedUntil: null });
  return { ok: true, id: cardId, dismissed: true, snoozedUntil: null };
}

export async function snoozeFeedCardForUser(
  state: AppState,
  currentUser: CurrentUserContext,
  cardId: string,
  minutes: unknown
) {
  const card = await state.repo.getFeedCardById(cardId);
  if (!card || !canAccessUser(currentUser, card.userId)) {
    return { status: 404 as const };
  }
  if (card.dismissed) {
    return { status: 409 as const };
  }

  const snoozeMinutes = parseSnoozeMinutes(minutes);
  const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60_000).toISOString();
  const postponeCount = (card.postponeCount ?? 0) + 1;
  const lastPostponedAt = new Date().toISOString();
  await state.repo.updateFeedCard(cardId, { snoozedUntil, postponeCount, lastPostponedAt });
  return { status: 200 as const, response: { ok: true, id: cardId, snoozeMinutes, snoozedUntil, postponeCount, lastPostponedAt } };
}

export async function refreshFeedCardForUser(state: AppState, currentUser: CurrentUserContext, cardId: string) {
  const card = await state.repo.getFeedCardById(cardId);
  if (!card || !canAccessUser(currentUser, card.userId)) {
    return null;
  }

  const refreshCount = (card.refreshCount ?? 0) + 1;
  await state.repo.updateFeedCard(cardId, { refreshCount, lastRefreshedAt: new Date().toISOString() });
  return { ok: true, refreshCount };
}

export async function generateFeedCardForUser(
  state: AppState,
  currentUser: CurrentUserContext,
  input: { title?: string | null; body?: string | null }
) {
  const card: StoredFeedCard = {
    id: randomUUID(),
    userId: currentUser.id,
    cardType: "item",
    lens: "all",
    itemId: null,
    taskId: null,
    title: input.title ?? "Generated insight",
    body: input.body ?? "AI generated placeholder.",
    dismissed: false,
    snoozedUntil: null,
    refreshCount: 0,
    postponeCount: 0,
    lastPostponedAt: null,
    lastRefreshedAt: null,
    createdAt: new Date().toISOString()
  };

  const persisted = await state.repo.createFeedCard(card);
  return toFeedCardContract(persisted, generatedCardWhyShown, { lastTouched: persisted.createdAt });
}
