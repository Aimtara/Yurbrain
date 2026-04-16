import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { FeedCardSchema, GenerateFeedCardRequestSchema } from "../../../../packages/contracts/src";
import { gatherFeedCandidates } from "../services/feed/candidates";
import { generateCardFromItem } from "../services/feed/generate-card";
import { rankFeedCards } from "../services/feed/rank";
import type { FeedWhyShown, StoredFeedCard } from "../services/feed/static-feed";
import { toFeedCardResponse } from "../services/feed/static-feed";
import type { AppState } from "../state";

const clusterCardThreshold = 3;

function parseLimit(value?: string): number {
  if (!value) return 20;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 20;
  return Math.max(1, Math.min(parsed, 50));
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

function inferRelatedCount(card: StoredFeedCard): number | null {
  if (typeof card.relatedCount === "number" && Number.isFinite(card.relatedCount)) {
    return Math.max(0, Math.trunc(card.relatedCount));
  }
  if (card.cardType !== "cluster") return null;
  const matched = card.body.match(/(\d+)\s+(captures|items|notes|threads)/i);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1] ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function toFeedCardContract(card: StoredFeedCard, whyShown: FeedWhyShown) {
  return FeedCardSchema.parse(toFeedCardResponse(card, whyShown));
}

const generatedCardWhyShown: FeedWhyShown = {
  summary: "Based on one of your saved memories.",
  reasons: [
    "Based on one of your saved memories.",
    "Kept visible so you can quickly pick up the thread."
  ]
};

export async function registerFeedRoutes(app: FastifyInstance, state: AppState) {
  app.get("/feed", async (request) => {
    const { userId, lens, includeSnoozed, limit } = request.query as {
      userId?: string;
      lens?: StoredFeedCard["lens"];
      includeSnoozed?: string;
      limit?: string;
    };

    request.log.info({ event: "feed_request_started", userId, lens, includeSnoozed, limit }, "feed request started");

    if (userId) {
      const existingCards = await state.repo.listFeedCardsByUser(userId);
      if (existingCards.length === 0) {
        const generated = (await state.repo.listBrainItemsByUser(userId)).map((item) => generateCardFromItem(item));
        for (const card of generated) {
          await state.repo.createFeedCard(card);
        }
      }
    }

    const cards = userId ? await state.repo.listFeedCardsByUser(userId) : [];
    const [brainItems, tasks] = userId ? await Promise.all([state.repo.listBrainItemsByUser(userId), state.repo.listTasks({ userId })]) : [[], []];
    const itemById = new Map(brainItems.map((item) => [item.id, item]));
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const cardsWithContext = cards.map((card) => {
      const linkedItem = card.itemId ? itemById.get(card.itemId) : null;
      const linkedTask = card.taskId ? taskById.get(card.taskId) : null;
      return {
        ...card,
        relatedCount: inferRelatedCount(card),
        lastTouched: card.lastTouched ?? linkedItem?.updatedAt ?? linkedTask?.updatedAt ?? card.lastRefreshedAt ?? card.createdAt
      };
    });
    const clusteredItemIds = new Set(
      cardsWithContext
        .filter((card) => card.cardType === "cluster" && (card.relatedCount ?? 0) >= clusterCardThreshold)
        .map((card) => card.itemId)
        .filter((itemId): itemId is string => Boolean(itemId))
    );
    const cardsForCandidates = cardsWithContext.filter(
      (card) => !(card.cardType === "item" && card.itemId && clusteredItemIds.has(card.itemId))
    );
    const candidates = gatherFeedCandidates(cardsForCandidates, {
      userId,
      lens,
      includeSnoozed: includeSnoozed === "true"
    });

    request.log.info({ event: "feed_candidates_gathered", candidateCount: candidates.length, userId, lens }, "feed candidates gathered");
    const ranked = rankFeedCards(candidates, { lens });
    request.log.info(
      { requestId: request.id, userId, lens, candidateCount: candidates.length, rankedCount: ranked.length },
      "feed_ranked"
    );
    const sliced = ranked
      .slice(0, parseLimit(limit))
      .map((rankedCard) => toFeedCardContract(rankedCard.card, rankedCard.whyShown));
    request.log.info({ event: "feed_rank_completed", returnedCount: sliced.length, userId, lens }, "feed rank completed");
    return sliced;
  });

  app.post("/ai/feed/generate-card", async (request, reply) => {
    const { userId, title, body } = GenerateFeedCardRequestSchema.parse(request.body);

    const card: StoredFeedCard = {
      id: randomUUID(),
      userId,
      cardType: "item",
      lens: "all",
      itemId: null,
      taskId: null,
      title: title ?? "Generated insight",
      body: body ?? "AI generated placeholder.",
      dismissed: false,
      snoozedUntil: null,
      refreshCount: 0,
      postponeCount: 0,
      relatedCount: null,
      lastPostponedAt: null,
      lastRefreshedAt: null,
      lastTouched: null,
      createdAt: new Date().toISOString()
    };

    const persisted = await state.repo.createFeedCard(card);
    return reply.code(201).send(toFeedCardContract(persisted, generatedCardWhyShown));
  });

  app.post("/feed/:id/dismiss", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await state.repo.getFeedCardById(id);
    if (!card) {
      request.log.warn({ event: "feed_card_missing", action: "dismiss", cardId: id }, "feed dismiss missing card");
      return reply.code(404).send({ message: "Feed card not found" });
    }
    await state.repo.updateFeedCard(id, { dismissed: true, snoozedUntil: null });
    return reply.send({ ok: true, id, dismissed: true, snoozedUntil: null });
  });

  app.post("/feed/:id/snooze", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { minutes } = (request.body as { minutes?: unknown }) ?? {};
    const card = await state.repo.getFeedCardById(id);
    if (!card) {
      request.log.warn({ event: "feed_card_missing", action: "snooze", cardId: id }, "feed snooze missing card");
      return reply.code(404).send({ message: "Feed card not found" });
    }

    if (card.dismissed) {
      return reply.code(409).send({ message: "Cannot snooze a dismissed card" });
    }

    const snoozeMinutes = parseSnoozeMinutes(minutes);
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60_000).toISOString();
    const postponeCount = (card.postponeCount ?? 0) + 1;
    const lastPostponedAt = new Date().toISOString();
    await state.repo.updateFeedCard(id, { snoozedUntil, postponeCount, lastPostponedAt });
    return reply.send({ ok: true, id, snoozeMinutes, snoozedUntil, postponeCount, lastPostponedAt });
  });

  app.post("/feed/:id/refresh", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await state.repo.getFeedCardById(id);
    if (!card) {
      request.log.warn({ event: "feed_card_missing", action: "refresh", cardId: id }, "feed refresh missing card");
      return reply.code(404).send({ message: "Feed card not found" });
    }

    const refreshCount = (card.refreshCount ?? 0) + 1;
    await state.repo.updateFeedCard(id, { refreshCount, lastRefreshedAt: new Date().toISOString() });
    request.log.info({ event: "feed_card_refreshed", cardId: id, refreshCount }, "feed card refreshed");
    return reply.send({ ok: true, refreshCount });
  });
}
