import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { GenerateFeedCardRequestSchema } from "../../../../packages/contracts/src";
import { gatherFeedCandidates } from "../services/feed/candidates";
import { generateCardFromItem } from "../services/feed/generate-card";
import { rankFeedCards } from "../services/feed/rank";
import type { StoredFeedCard } from "../services/feed/static-feed";
import type { AppState } from "../state";

function parseLimit(value?: string): number {
  if (!value) return 20;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 20;
  return Math.max(1, Math.min(parsed, 50));
}

export async function registerFeedRoutes(app: FastifyInstance, state: AppState) {
  app.get("/feed", async (request) => {
    const { userId, lens, includeSnoozed, limit } = request.query as {
      userId?: string;
      lens?: StoredFeedCard["lens"];
      includeSnoozed?: string;
      limit?: string;
    };

    if (state.feedCards.size === 0 && userId) {
      const generated = Array.from(state.brainItems.values())
        .filter((item) => item.userId === userId)
        .map((item) => generateCardFromItem(item));

      for (const card of generated) {
        state.feedCards.set(card.id, card);
      }
    }

    const candidates = gatherFeedCandidates(state.feedCards.values(), {
      userId,
      lens,
      includeSnoozed: includeSnoozed === "true"
    });

    const ranked = rankFeedCards(candidates, { lens });
    request.log.info(
      { requestId: request.requestId, userId, lens, candidateCount: candidates.length, rankedCount: ranked.length },
      "feed_ranked"
    );
    return ranked.slice(0, parseLimit(limit));
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
      createdAt: new Date().toISOString()
    };

    state.feedCards.set(card.id, card);
    return reply.code(201).send(card);
  });

  app.post("/feed/:id/dismiss", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = state.feedCards.get(id);
    if (!card) return reply.code(404).send({ message: "Feed card not found" });
    card.dismissed = true;
    return reply.send({ ok: true });
  });

  app.post("/feed/:id/snooze", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { minutes = 60 } = request.body as { minutes?: number };
    const card = state.feedCards.get(id);
    if (!card) return reply.code(404).send({ message: "Feed card not found" });

    const snoozeMinutes = Math.max(5, Math.min(minutes, 60 * 24 * 7));
    card.snoozedUntil = new Date(Date.now() + snoozeMinutes * 60_000).toISOString();
    return reply.send({ ok: true, snoozedUntil: card.snoozedUntil });
  });

  app.post("/feed/:id/refresh", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = state.feedCards.get(id);
    if (!card) return reply.code(404).send({ message: "Feed card not found" });

    card.refreshCount = (card.refreshCount ?? 0) + 1;
    card.lastRefreshedAt = new Date().toISOString();
    return reply.send({ ok: true, refreshCount: card.refreshCount });
  });
}
