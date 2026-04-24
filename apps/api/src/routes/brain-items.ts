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
  ListBrainItemsQuerySchema,
  ListItemArtifactsQuerySchema,
  RelatedItemsResponseSchema,
  UpdateBrainItemRequestSchema
} from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { detectRelatedItems } from "../services/capture/related-items";
import { buildBrainItemCreatedEventPayload, buildBrainItemUpdatedEventPayload } from "../services/events/policy";
import { generateCardFromItem } from "../services/feed/generate-card";
import type { AppState } from "../state";

export async function registerBrainItemRoutes(app: FastifyInstance, state: AppState) {
  function normalizeDateInput(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = new Date(normalized);
    if (!Number.isFinite(parsed.getTime())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return parsed.toISOString();
  }

  app.post("/brain-items", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = CreateBrainItemRequestSchema.parse(request.body);
    const now = new Date().toISOString();

    const item = BrainItemResponseSchema.parse({
      id: randomUUID(),
      userId: currentUser.id,
      type: BrainItemTypeSchema.parse(payload.type),
      title: payload.title,
      rawContent: payload.rawContent,
      status: BrainItemStatusSchema.parse("active"),
      createdAt: now,
      updatedAt: now
    });

    await state.repo.createBrainItem(item);
    const existingCards = await state.repo.listFeedCardsByUser(item.userId);
    const hasCardForItem = existingCards.some((card) => card.itemId === item.id);
    if (!hasCardForItem) {
      await state.repo.createFeedCard(
        generateCardFromItem({
          id: item.id,
          userId: item.userId,
          title: item.title,
          rawContent: item.rawContent,
          createdAt: item.createdAt
        })
      );
    }
    await state.repo.appendEvent({
      id: randomUUID(),
      userId: item.userId,
      eventType: EventTypeSchema.parse("brain_item_created"),
      payload: buildBrainItemCreatedEventPayload({
        id: item.id,
        type: item.type,
        contentType: item.contentType,
        topicGuess: item.topicGuess
      }),
      occurredAt: now
    });

    return reply.code(201).send(item);
  });

  app.get("/brain-items/:id", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    if (!canAccessUser(currentUser, item.userId)) {
      return reply.code(404).send({ message: "Brain item not found" });
    }

    return reply.send(item);
  });

  app.get("/brain-items", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const rawQuery = ListBrainItemsQuerySchema.parse(request.query ?? {});
    const query = {
      ...rawQuery,
      createdFrom: normalizeDateInput(rawQuery.createdFrom),
      createdTo: normalizeDateInput(rawQuery.createdTo)
    };
    const hasSearchOrFilters = Boolean(
      query.q?.trim() ||
        query.type ||
        query.tag?.trim() ||
        query.createdFrom ||
        query.createdTo ||
        query.status ||
        query.processingStatus ||
        query.limit
    );
    if (!hasSearchOrFilters) {
      return state.repo.listBrainItemsByUser(currentUser.id);
    }
    return state.repo.searchBrainItemsByUser(currentUser.id, query);
  });

  app.get("/brain-items/:id/artifacts", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    if (!canAccessUser(currentUser, item.userId)) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    const query = ListItemArtifactsQuerySchema.parse(request.query ?? {});
    const artifacts = await state.repo.listArtifactsByItem(id, query.type ? { type: query.type } : undefined);
    const response = artifacts.map((artifact) => ({
      id: artifact.id,
      itemId: artifact.itemId,
      type: artifact.type,
      payload: artifact.payload,
      confidence: artifact.confidence,
      createdAt: artifact.createdAt
    }));
    return reply.send(ItemArtifactListResponseSchema.parse(response));
  });

  app.get("/brain-items/:id/related", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    if (!canAccessUser(currentUser, item.userId)) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    const relatedItemIds = detectRelatedItems(item, await state.repo.listBrainItemsByUser(item.userId), { limit: 8 }).map(
      (related) => related.id
    );
    return reply.send(
      RelatedItemsResponseSchema.parse({
        itemId: id,
        relatedItemIds
      })
    );
  });

  app.patch("/brain-items/:id", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const existing = await state.repo.getBrainItemById(id);

    if (!existing) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    if (!canAccessUser(currentUser, existing.userId)) {
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
      payload: buildBrainItemUpdatedEventPayload({
        id: updated.id,
        changed: Object.keys(updates)
      }),
      occurredAt: updated.updatedAt
    });

    return reply.send(updated);
  });
}
