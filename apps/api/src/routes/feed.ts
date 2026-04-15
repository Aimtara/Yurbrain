import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { FeedCardSchema, GenerateFeedCardRequestSchema } from "../../../../packages/contracts/src";
import { gatherFeedCandidates } from "../services/feed/candidates";
import { generateCardFromItem } from "../services/feed/generate-card";
import { rankFeedCards } from "../services/feed/rank";
import type { FeedWhyShown, StoredFeedCard } from "../services/feed/static-feed";
import { toFeedCardResponse } from "../services/feed/static-feed";
import type { AppState } from "../state";

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
    const candidates = gatherFeedCandidates(cards, {
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
      title: title ?? "Generated insight",
      body: body ?? "AI generated placeholder.",
      dismissed: false,
      snoozedUntil: null,
      refreshCount: 0,
      lastRefreshedAt: null,
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
    await state.repo.updateFeedCard(id, { snoozedUntil });
    return reply.send({ ok: true, id, snoozeMinutes, snoozedUntil });
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
