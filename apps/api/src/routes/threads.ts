import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { CreateThreadRequestSchema } from "../../../../packages/contracts/src";
import type { AppState } from "../state";

export async function registerThreadRoutes(app: FastifyInstance, state: AppState) {
  app.post("/threads", async (request, reply) => {
    const { targetItemId, kind } = CreateThreadRequestSchema.parse(request.body);
    const now = new Date().toISOString();
    const thread = { id: randomUUID(), targetItemId, kind, createdAt: now, updatedAt: now };

    state.threads.set(thread.id, thread);
    state.messages.set(thread.id, []);

    return reply.code(201).send(thread);
  });

  app.get("/threads/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const thread = state.threads.get(id);
    if (!thread) return reply.code(404).send({ message: "Thread not found" });
    return reply.send(thread);
  });

  app.get("/threads/by-target", async (request) => {
    const { targetItemId } = request.query as { targetItemId?: string };
    return Array.from(state.threads.values()).filter((thread) => !targetItemId || thread.targetItemId === targetItemId);
  });
}
