import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  AiArtifactResponseSchema,
  AiConvertRequestSchema,
  AiConvertResponseSchema,
  QueryItemResponseSchema
} from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { sendSafeErrorResponse } from "../middleware/observability";
import { classifyItem } from "../services/ai/classify";
import { queryItemAssistant } from "../services/ai/item-query";
import { summarizeItem } from "../services/ai/summarize";
import { convertToTaskDecision } from "../services/tasks/convert";
import type { AppState } from "../state";

const ItemAiRequestSchema = z
  .object({
    rawContent: z.string().min(1).optional(),
    timeoutMs: z.number().int().min(100).max(10_000).optional()
  })
  .strict();

const ItemQueryAliasRequestSchema = z
  .object({
    question: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(10_000).optional()
  })
  .strict();

function sendRouteError(
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  message: string,
  code: string
) {
  return sendSafeErrorResponse(request as FastifyRequest & { correlationId?: string }, reply, {
    statusCode,
    message,
    code
  });
}

async function getOwnedBrainItem(
  state: AppState,
  currentUser: { id: string; source: "header" | "authorization" },
  itemId: string
) {
  const item = await state.repo.getBrainItemById(itemId);
  if (!item || !canAccessUser(currentUser, item.userId)) return null;
  return item;
}

async function getOrCreateItemChatThread(state: AppState, userId: string, itemId: string) {
  const threads = await state.repo.listThreads(itemId);
  const existing = threads.find((thread) => thread.kind === "item_chat");
  if (existing) return existing;
  const now = new Date().toISOString();
  return state.repo.createThread({
    id: randomUUID(),
    targetItemId: itemId,
    userId,
    kind: "item_chat",
    createdAt: now,
    updatedAt: now
  });
}

export async function registerAiRoutes(app: FastifyInstance, state: AppState) {
  app.post("/ai/brain-items/:id/summarize", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const payload = ItemAiRequestSchema.parse(request.body ?? {});
    const item = await getOwnedBrainItem(state, currentUser, id);
    if (!item) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await summarizeItem(
      state,
      { itemId: item.id, rawContent: item.rawContent, timeoutMs: payload.timeoutMs },
      request.log,
      (request as { correlationId?: string }).correlationId
    );
    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/brain-items/:id/classify", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const payload = ItemAiRequestSchema.parse(request.body ?? {});
    const item = await getOwnedBrainItem(state, currentUser, id);
    if (!item) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await classifyItem(
      state,
      { itemId: item.id, rawContent: item.rawContent, timeoutMs: payload.timeoutMs },
      request.log,
      (request as { correlationId?: string }).correlationId
    );
    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/brain-items/:id/query", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const payload = ItemQueryAliasRequestSchema.parse(request.body ?? {});
    const item = await getOwnedBrainItem(state, currentUser, id);
    if (!item) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const thread = await getOrCreateItemChatThread(state, currentUser.id, item.id);
    const result = await queryItemAssistant(
      state,
      { threadId: thread.id, question: payload.question, timeoutMs: payload.timeoutMs },
      request.log,
      (request as { correlationId?: string }).correlationId
    );
    if (!result) {
      return sendRouteError(request, reply, 404, "Thread not found", "THREAD_NOT_FOUND");
    }
    return reply.code(201).send(QueryItemResponseSchema.parse(result));
  });

  app.post("/ai/convert", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = AiConvertRequestSchema.parse(request.body);
    if (payload.sourceItemId) {
      const sourceItem = await getOwnedBrainItem(state, currentUser, payload.sourceItemId);
      if (!sourceItem) {
        return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
      }
    }
    const decision = convertToTaskDecision({ ...payload, userId: currentUser.id });
    if (decision.outcome === "task_created") {
      await state.repo.createTask(decision.task);
    }
    return reply.code(201).send(AiConvertResponseSchema.parse(decision));
  });
}
