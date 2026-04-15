import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { FeedCardSchema, GenerateFeedCardRequestSchema, ListFeedQuerySchema } from "../../../../packages/contracts/src";
import { gatherFeedCandidates } from "../services/feed/candidates";
import { generateCardFromItem } from "../services/feed/generate-card";
import { rankFeedCards } from "../services/feed/rank";
import type { FeedWhyShown, StoredFeedCard } from "../services/feed/static-feed";
import { toFeedCardResponse } from "../services/feed/static-feed";
import type { AppState } from "../state";

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

function parseBooleanQuery(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  return value === "true";
}

function parseLimitQuery(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function toFeedCardContract(card: StoredFeedCard, whyShown: FeedWhyShown) {
  return FeedCardSchema.parse(toFeedCardResponse(card, whyShown));
}

const generatedCardWhyShown: FeedWhyShown = {
  summary: "Generated from one of your saved items.",
  reasons: [
    "Generated from one of your saved items.",
    "Kept concise so your feed stays focused."
  ]
};

export async function registerFeedRoutes(app: FastifyInstance, state: AppState) {
  app.get("/feed", async (request) => {
    const query = ListFeedQuerySchema.parse({
      ...((request.query as Record<string, unknown>) ?? {}),
      includeSnoozed: parseBooleanQuery((request.query as { includeSnoozed?: unknown }).includeSnoozed),
      founderMode: parseBooleanQuery((request.query as { founderMode?: unknown }).founderMode),
      limit: parseLimitQuery((request.query as { limit?: unknown }).limit)
    });
    const { userId, lens, includeSnoozed, limit, executionLens, founderMode } = query;

    request.log.info({ event: "feed_request_started", userId, lens, includeSnoozed, limit, executionLens, founderMode }, "feed request started");

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
    const shouldApplyExecutionLens = founderMode === true && executionLens && executionLens !== "all";
    const tasksById = new Map<string, "todo" | "in_progress" | "done">();
    const itemExecutionById = new Map<string, "none" | "candidate" | "planned" | "in_progress" | "blocked" | "done">();
    if (userId && shouldApplyExecutionLens) {
      const [tasks, items] = await Promise.all([state.repo.listTasks({ userId }), state.repo.listBrainItemsByUser(userId)]);
      for (const task of tasks) {
        tasksById.set(task.id, task.status);
      }
      for (const item of items) {
        if (item.execution?.status) {
          itemExecutionById.set(item.id, item.execution.status);
        }
      }
    }

    const candidates = gatherFeedCandidates(cards, {
      userId,
      lens,
      includeSnoozed: includeSnoozed ?? false,
      executionLens: shouldApplyExecutionLens ? executionLens : undefined,
      taskStatusById: (taskId) => tasksById.get(taskId),
      itemExecutionStatusById: (itemId) => itemExecutionById.get(itemId)
    });

    request.log.info(
      { event: "feed_candidates_gathered", candidateCount: candidates.length, userId, lens, executionLens: shouldApplyExecutionLens ? executionLens : "all" },
      "feed candidates gathered"
    );
    const ranked = rankFeedCards(candidates, { lens, executionLens: shouldApplyExecutionLens ? executionLens : "all" });
    request.log.info(
      { requestId: request.id, userId, lens, candidateCount: candidates.length, rankedCount: ranked.length },
      "feed_ranked"
    );
    const sliced = ranked
      .slice(0, limit ?? 20)
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
