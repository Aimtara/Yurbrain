import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { CreateMessageRequestSchema } from "../../../../packages/contracts/src";
import type { AppState } from "../state";

export async function registerMessageRoutes(app: FastifyInstance, state: AppState) {
  app.post("/messages", async (request, reply) => {
    const { threadId, role, content } = CreateMessageRequestSchema.parse(request.body);
    const thread = await state.repo.getThreadById(threadId);
    if (!thread) return reply.code(404).send({ message: "Thread not found" });

    const message = { id: randomUUID(), threadId, role, content, createdAt: new Date().toISOString() };
    await state.repo.createMessage(message);

    return reply.code(201).send(message);
  });

  app.get("/threads/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const thread = await state.repo.getThreadById(id);
    if (!thread) return reply.code(404).send({ message: "Thread not found" });
    return reply.send(await state.repo.listMessagesByThread(id));
  });
}
