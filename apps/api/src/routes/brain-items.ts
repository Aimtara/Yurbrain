import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  BrainItemResponseSchema,
  BrainItemSchema,
  BrainItemStatusSchema,
  BrainItemTypeSchema,
  CreateBrainItemRequestSchema,
  ItemArtifactListResponseSchema,
  EventTypeSchema,
  ListItemArtifactsQuerySchema,
  UpdateBrainItemRequestSchema
} from "../../../../packages/contracts/src";
import type { AppState } from "../state";

export async function registerBrainItemRoutes(app: FastifyInstance, state: AppState) {
  app.post("/brain-items", async (request, reply) => {
    const payload = CreateBrainItemRequestSchema.parse(request.body);
    const now = new Date().toISOString();

    const item = BrainItemResponseSchema.parse({
      id: randomUUID(),
      userId: payload.userId,
      type: BrainItemTypeSchema.parse(payload.type),
      title: payload.title,
      rawContent: payload.rawContent,
      status: BrainItemStatusSchema.parse("active"),
      createdAt: now,
      updatedAt: now
    });

    await state.repo.createBrainItem(item);
    await state.repo.appendEvent({
      id: randomUUID(),
      userId: item.userId,
      eventType: EventTypeSchema.parse("brain_item_created"),
      payload: { id: item.id, type: item.type },
      occurredAt: now
    });

    return reply.code(201).send(item);
  });

  app.get("/brain-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }

    return reply.send(item);
  });

  app.get("/brain-items", async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ message: "userId query parameter is required" });
    }

    return state.repo.listBrainItemsByUser(userId);
  });

  app.get("/brain-items/:id/artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    const query = ListItemArtifactsQuerySchema.parse(request.query ?? {});
    const artifacts = await state.repo.listArtifactsByItem(id, query.type ? { type: query.type } : undefined);
    return reply.send(ItemArtifactListResponseSchema.parse(artifacts));
  });

  app.patch("/brain-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await state.repo.getBrainItemById(id);

    if (!existing) {
      return reply.code(404).send({ message: "Brain item not found" });
    }

    const updates = UpdateBrainItemRequestSchema.parse(request.body);
    const updated = BrainItemSchema.parse({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    });

    await state.repo.updateBrainItem(id, {
      type: updated.type,
      title: updated.title,
      rawContent: updated.rawContent,
      status: updated.status,
      updatedAt: updated.updatedAt
    });
    await state.repo.appendEvent({
      id: randomUUID(),
      userId: updated.userId,
      eventType: EventTypeSchema.parse("brain_item_updated"),
      payload: { id: updated.id, changed: Object.keys(updates) },
      occurredAt: updated.updatedAt
    });

    return reply.send(updated);
  });
}
