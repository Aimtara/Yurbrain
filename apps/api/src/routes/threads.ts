import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { CreateThreadRequestSchema } from "../../../../packages/contracts/src";
import { requireCurrentUser } from "../middleware/current-user";
import type { AppState } from "../state";

export async function registerThreadRoutes(app: FastifyInstance, state: AppState) {
  app.post("/threads", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { targetItemId, kind } = CreateThreadRequestSchema.parse(request.body);
    const targetItem = await state.repo.getBrainItemById(targetItemId);
    if (!targetItem || targetItem.userId !== currentUser.id) {
      return reply.code(404).send({ message: "Thread target not found" });
    }
    const now = new Date().toISOString();
    const thread = { id: randomUUID(), targetItemId, kind, createdAt: now, updatedAt: now };

    await state.repo.createThread(thread);

    return reply.code(201).send(thread);
  });

  app.get("/threads/:id", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const thread = await state.repo.getThreadById(id);
    if (!thread) return reply.code(404).send({ message: "Thread not found" });
    const targetItem = await state.repo.getBrainItemById(thread.targetItemId);
    if (!targetItem || targetItem.userId !== currentUser.id) {
      return reply.code(404).send({ message: "Thread not found" });
    }
    return reply.send(thread);
  });

  app.get("/threads/by-target", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { targetItemId } = request.query as { targetItemId?: string };
    if (!targetItemId) {
      return [];
    }
    const targetItem = await state.repo.getBrainItemById(targetItemId);
    if (!targetItem || targetItem.userId !== currentUser.id) {
      return [];
    }
    return state.repo.listThreads(targetItemId);
  });
}
