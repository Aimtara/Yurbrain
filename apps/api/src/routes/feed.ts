import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { GenerateFeedCardRequestSchema } from "../../../../packages/contracts/src";
import { getDeterministicFeed } from "../services/feed/static-feed";
import type { AppState } from "../state";

export async function registerFeedRoutes(app: FastifyInstance, state: AppState) {
  app.get("/feed", async (request) => {
    const { userId } = request.query as { userId?: string };
    return getDeterministicFeed(state.feedCards.values(), userId);
  });

  app.post("/ai/feed/generate-card", async (request, reply) => {
    const { userId, title, body } = GenerateFeedCardRequestSchema.parse(request.body);

    const card = {
      id: randomUUID(),
      userId,
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
}
