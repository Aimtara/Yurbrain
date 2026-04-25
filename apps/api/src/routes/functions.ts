import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AiArtifactResponseSchema,
  AiConvertRequestSchema,
  AiConvertResponseSchema,
  ClassifyItemRequestSchema,
  FounderReviewDiagnosticsResponseSchema,
  FounderReviewQuerySchema,
  FeedLensSchema,
  FounderReviewResponseSchema,
  QueryItemRequestSchema,
  QueryItemResponseSchema,
  SummarizeItemRequestSchema,
  type FounderReviewResponse,
  type FounderReviewQuery
} from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { sendSafeErrorResponse } from "../middleware/observability";
import { classifyItem } from "../services/ai/classify";
import { queryItemAssistant } from "../services/ai/item-query";
import { summarizeItem } from "../services/ai/summarize";
import { convertToTaskDecision } from "../services/tasks/convert";
import {
  buildFunctionFeed,
  dismissFeedCardForUser,
  parseFunctionFeedInput,
  refreshFeedCardForUser,
  snoozeFeedCardForUser
} from "../services/functions/feed-logic";
import {
  buildFounderReviewDiagnostics,
  buildFounderReviewForFunction
} from "../services/functions/founder-review-logic";
import {
  buildWhatShouldIDoNext,
  buildSummarizeProgress
} from "../services/functions/synthesis-logic";
import {
  buildPauseSessionResult,
  buildFinishSessionResult,
  buildStartSessionResult
} from "../services/functions/session-helper-logic";
import type { AppState } from "../state";

function parseQueryBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return undefined;
}

function parseQueryNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseFounderReviewQuery(raw: Record<string, unknown>): FounderReviewQuery {
  return FounderReviewQuerySchema.parse({
    window: raw.window,
    includeAi: raw.includeAi
  });
}

function parseSynthesisItemIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string");
}

function parseFeedLens(value: unknown):
  | "all"
  | "keep_in_mind"
  | "open_loops"
  | "learning"
  | "in_progress"
  | "recently_commented"
  | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = FeedLensSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function hasScopedItemOwnership(
  currentUserId: string,
  itemOwnerIds: string[]
): boolean {
  return itemOwnerIds.every((ownerId) => ownerId === currentUserId);
}

export async function registerFunctionRoutes(app: FastifyInstance, state: AppState) {
  const sendRouteError = (
    request: FastifyRequest,
    reply: FastifyReply,
    statusCode: number,
    message: string,
    code: string
  ) => sendSafeErrorResponse(request as FastifyRequest & { correlationId?: string }, reply, { statusCode, message, code });

  const handleFunctionFeedGet = async (request: FastifyRequest, reply: FastifyReply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const query = request.query as Record<string, unknown>;
    const input = parseFunctionFeedInput({
      lens: parseFeedLens(query.lens),
      includeSnoozed: parseQueryBoolean(query.includeSnoozed),
      limit: parseQueryNumber(query.limit)
    });
    const result = await buildFunctionFeed(state, currentUser.id, input);
    return reply.code(200).send(result.cards);
  };
  app.get("/functions/feed", handleFunctionFeedGet);
  app.post("/functions/feed/:id/dismiss", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const result = await dismissFeedCardForUser(state, currentUser, id);
    if (!result) {
      return sendRouteError(request, reply, 404, "Feed card not found", "FEED_CARD_NOT_FOUND");
    }
    return reply.code(200).send(result);
  });
  app.post("/functions/feed/:id/snooze", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const { minutes } = (request.body as { minutes?: unknown }) ?? {};
    const result = await snoozeFeedCardForUser(state, currentUser, id, minutes);
    if (result.status === 404) {
      return sendRouteError(request, reply, 404, "Feed card not found", "FEED_CARD_NOT_FOUND");
    }
    if (result.status === 409) {
      return sendRouteError(request, reply, 409, "Cannot snooze a dismissed card", "FEED_CARD_SNOOZE_CONFLICT");
    }
    return reply.code(200).send(result.response);
  });
  app.post("/functions/feed/:id/refresh", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const result = await refreshFeedCardForUser(state, currentUser, id);
    if (!result) {
      return sendRouteError(request, reply, 404, "Feed card not found", "FEED_CARD_NOT_FOUND");
    }
    return reply.code(200).send(result);
  });

  app.post("/functions/summarize", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = SummarizeItemRequestSchema.parse(request.body);
    const item = await state.repo.getBrainItemById(payload.itemId);
    if (!item || !canAccessUser(currentUser, item.userId)) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await summarizeItem(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/functions/classify", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = ClassifyItemRequestSchema.parse(request.body);
    const item = await state.repo.getBrainItemById(payload.itemId);
    if (!item || !canAccessUser(currentUser, item.userId)) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await classifyItem(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/functions/query", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = QueryItemRequestSchema.parse(request.body);
    const thread = await state.repo.getThreadById(payload.threadId);
    if (!thread) {
      return sendRouteError(request, reply, 404, "Thread not found", "THREAD_NOT_FOUND");
    }
    const item = await state.repo.getBrainItemById(thread.targetItemId);
    if (!item || !canAccessUser(currentUser, item.userId)) {
      return sendRouteError(request, reply, 404, "Thread not found", "THREAD_NOT_FOUND");
    }
    const result = await queryItemAssistant(state, payload, request.log, (request as { correlationId?: string }).correlationId);
    if (!result) {
      return sendRouteError(request, reply, 404, "Thread not found", "THREAD_NOT_FOUND");
    }
    return reply.code(201).send(QueryItemResponseSchema.parse(result));
  });

  app.post("/functions/convert", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = AiConvertRequestSchema.parse(request.body);
    if (payload.sourceItemId) {
      const sourceItem = await state.repo.getBrainItemById(payload.sourceItemId);
      if (!sourceItem || !canAccessUser(currentUser, sourceItem.userId)) {
        return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
      }
    }
    const decision = convertToTaskDecision({ ...payload, userId: currentUser.id });

    if (decision.outcome === "task_created") {
      await state.repo.createTask(decision.task);
    }

    return reply.code(201).send(AiConvertResponseSchema.parse(decision));
  });

  app.post("/functions/summarize-progress", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const itemIds = parseSynthesisItemIds(body.itemIds);
    if (itemIds.length === 0) {
      return sendRouteError(request, reply, 400, "itemIds must include at least one item", "ITEM_IDS_REQUIRED");
    }

    const items = await Promise.all(itemIds.map((itemId) => state.repo.getBrainItemById(itemId)));
    const ownedItems = items.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (ownedItems.length !== itemIds.length) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    if (!hasScopedItemOwnership(currentUser.id, ownedItems.map((item) => item.userId))) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await buildSummarizeProgress(state.repo, itemIds, {
      log: request.log,
      correlationId: (request as { correlationId?: string }).correlationId
    });
    return reply.code(201).send(result);
  });

  const handleWhatShouldIDoNext = async (request: FastifyRequest, reply: FastifyReply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const itemIds = parseSynthesisItemIds(body.itemIds);
    if (itemIds.length === 0) {
      return sendRouteError(request, reply, 400, "itemIds must include at least one item", "ITEM_IDS_REQUIRED");
    }

    const items = await Promise.all(itemIds.map((itemId) => state.repo.getBrainItemById(itemId)));
    const ownedItems = items.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (ownedItems.length !== itemIds.length) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    if (!hasScopedItemOwnership(currentUser.id, ownedItems.map((item) => item.userId))) {
      return sendRouteError(request, reply, 404, "Brain item not found", "BRAIN_ITEM_NOT_FOUND");
    }
    const result = await buildWhatShouldIDoNext(state.repo, itemIds, {
      log: request.log,
      correlationId: (request as { correlationId?: string }).correlationId
    });
    return reply.code(201).send(result);
  };
  app.post("/functions/what-should-i-do-next", handleWhatShouldIDoNext);

  app.get("/functions/founder-review", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const parsedQuery = parseFounderReviewQuery((request.query ?? {}) as Record<string, unknown>);
    const review = await buildFounderReviewForFunction({
      repo: state.repo,
      userId: currentUser.id,
      window: parsedQuery.window,
      includeAi: parsedQuery.includeAi
    });
    reply.header("Cache-Control", "no-store");
    return reply.code(200).send(FounderReviewResponseSchema.parse(review));
  });

  app.get("/functions/founder-review/diagnostics", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const parsedQuery = parseFounderReviewQuery((request.query ?? {}) as Record<string, unknown>);
    const diagnostics = await buildFounderReviewDiagnostics({
      repo: state.repo,
      userId: currentUser.id,
      window: parsedQuery.window,
      includeAi: parsedQuery.includeAi
    });
    return reply.code(200).send(FounderReviewDiagnosticsResponseSchema.parse(diagnostics));
  });

  app.post("/functions/session-helper", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const body = (request.body ?? {}) as {
      action?: "start" | "pause" | "finish";
      taskId?: string;
      sessionId?: string;
    };

    if (body.action === "start") {
      if (!body.taskId) {
        return sendRouteError(request, reply, 400, "taskId is required for start", "TASK_ID_REQUIRED");
      }
      const task = await state.repo.getTaskById(body.taskId);
      if (!task || !canAccessUser(currentUser, task.userId)) {
        return sendRouteError(request, reply, 404, "Task not found", "TASK_NOT_FOUND");
      }
      const result = await buildStartSessionResult(state, body.taskId);
      if (!result.session) {
        return sendRouteError(request, reply, 404, "Task not found", "TASK_NOT_FOUND");
      }
      return reply.code(201).send(result.session);
    }

    if (body.action === "pause" || body.action === "finish") {
      if (!body.sessionId) {
        return sendRouteError(request, reply, 400, "sessionId is required for pause/finish", "SESSION_ID_REQUIRED");
      }
      const existingSession = await state.repo.getSessionById(body.sessionId);
      if (!existingSession) {
        return sendRouteError(request, reply, 404, "Session not found or already finished", "SESSION_NOT_FOUND");
      }
      const task = await state.repo.getTaskById(existingSession.taskId);
      if (!task || !canAccessUser(currentUser, task.userId)) {
        return sendRouteError(request, reply, 404, "Session not found or already finished", "SESSION_NOT_FOUND");
      }
      if (body.action === "pause") {
        const result = await buildPauseSessionResult(state, body.sessionId);
        if (!result.session) {
          return sendRouteError(request, reply, 404, "Session not found or already finished", "SESSION_NOT_FOUND");
        }
        return reply.code(200).send(result.session);
      }
      const result = await buildFinishSessionResult(state, body.sessionId);
      if (!result.session) {
        return sendRouteError(request, reply, 404, "Session not found or already finished", "SESSION_NOT_FOUND");
      }
      return reply.code(200).send(result.session);
    }

    return sendRouteError(request, reply, 400, "action must be one of start, pause, finish", "INVALID_SESSION_ACTION");
  });

}
