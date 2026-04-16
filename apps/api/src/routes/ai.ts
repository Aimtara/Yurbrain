import type { FastifyInstance } from "fastify";
import {
  AiClusterSynthesisRequestSchema,
  AiClusterSynthesisResponseSchema,
  AiArtifactResponseSchema,
  ClassifyItemRequestSchema,
  QueryItemRequestSchema,
  QueryItemResponseSchema,
  SummarizeItemRequestSchema
} from "../../../../packages/contracts/src";
import { classifyItem } from "../services/ai/classify";
import { synthesizeCluster } from "../services/ai/cluster-synthesis";
import { queryItemAssistant } from "../services/ai/item-query";
import { summarizeItem } from "../services/ai/summarize";
import type { AppState } from "../state";

export async function registerAiRoutes(app: FastifyInstance, state: AppState) {
  async function buildClusterSynthesisInput(itemIds: string[]) {
    const items = (await Promise.all(itemIds.map((itemId) => state.repo.getBrainItemById(itemId)))).flatMap((item) => (item ? [item] : []));
    if (items.length === 0) {
      return null;
    }
    const itemIdSet = new Set(items.map((item) => item.id));
    const relatedTasks = (await state.repo.listTasks({ userId: items[0]?.userId })).filter(
      (task) => task.sourceItemId && itemIdSet.has(task.sourceItemId)
    );
    const relatedTaskIds = new Set(relatedTasks.map((task) => task.id));
    const relatedSessions =
      relatedTaskIds.size > 0 ? (await state.repo.listSessions({ userId: items[0]?.userId })).filter((session) => relatedTaskIds.has(session.taskId)) : [];
    const relatedThreads = (await Promise.all(items.map((item) => state.repo.listThreads(item.id)))).flat();
    const relatedMessages = (
      await Promise.all(
        relatedThreads.map(async (thread) => {
          const messages = await state.repo.listMessagesByThread(thread.id);
          return messages;
        })
      )
    ).flat();
    return {
      items,
      messages: relatedMessages,
      tasks: relatedTasks,
      sessions: relatedSessions
    };
  }

  app.post("/ai/summarize", async (request, reply) => {
    const payload = SummarizeItemRequestSchema.parse(request.body);
    const result = await summarizeItem(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    request.log.info(
      { requestId: request.id, task: "summarize", itemId: payload.itemId, fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason },
      "ai_task_completed"
    );

    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/classify", async (request, reply) => {
    const payload = ClassifyItemRequestSchema.parse(request.body);
    const result = await classifyItem(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    request.log.info(
      { requestId: request.id, task: "classify", itemId: payload.itemId, fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason },
      "ai_task_completed"
    );

    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/query", async (request, reply) => {
    const payload = QueryItemRequestSchema.parse(request.body);
    const result = await queryItemAssistant(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    if (!result) {
      return reply.code(404).send({ message: "Thread not found" });
    }
    request.log.info(
      { requestId: request.id, task: "query", threadId: payload.threadId, fallbackUsed: result.fallbackUsed, fallbackReason: result.fallbackReason },
      "ai_task_completed"
    );

    return reply.code(201).send(QueryItemResponseSchema.parse(result));
  });

  app.post("/ai/summarize-cluster", async (request, reply) => {
    const payload = AiClusterSynthesisRequestSchema.parse(request.body);
    const synthesisInput = await buildClusterSynthesisInput(payload.itemIds);
    if (!synthesisInput) {
      return reply.code(404).send({ message: "No matching items found for cluster synthesis" });
    }
    const result = synthesizeCluster(synthesisInput, "summary");
    return reply.code(200).send(AiClusterSynthesisResponseSchema.parse(result));
  });

  app.post("/ai/next-step", async (request, reply) => {
    const payload = AiClusterSynthesisRequestSchema.parse(request.body);
    const synthesisInput = await buildClusterSynthesisInput(payload.itemIds);
    if (!synthesisInput) {
      return reply.code(404).send({ message: "No matching items found for next-step synthesis" });
    }
    const result = synthesizeCluster(synthesisInput, "next_step");
    return reply.code(200).send(AiClusterSynthesisResponseSchema.parse(result));
  });
}
