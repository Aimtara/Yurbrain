import type { FastifyInstance } from "fastify";
import {
  FounderReviewQuerySchema,
  FeedLensSchema,
  FounderReviewResponseSchema,
  type FounderReviewResponse,
  type FounderReviewQuery
} from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { buildFunctionFeed, parseFunctionFeedInput } from "../services/functions/feed-logic";
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
  buildSessionDiagnostics,
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
    userId: raw.userId,
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

function assertScopedItemOwnership(
  currentUserId: string,
  itemOwnerIds: string[]
) {
  for (const ownerId of itemOwnerIds) {
    if (ownerId !== currentUserId) {
      throw new Error("Brain item not found");
    }
  }
}

export async function registerFunctionRoutes(app: FastifyInstance, state: AppState) {
  app.get("/functions/feed", async (request, reply) => {
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
  });

  app.post("/functions/summarize-progress", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const itemIds = parseSynthesisItemIds(body.itemIds);
    if (itemIds.length === 0) {
      return reply.code(400).send({ message: "itemIds must include at least one item" });
    }

    const items = await Promise.all(itemIds.map((itemId) => state.repo.getBrainItemById(itemId)));
    const ownedItems = items.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (ownedItems.length !== itemIds.length) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    assertScopedItemOwnership(currentUser.id, ownedItems.map((item) => item.userId));
    const result = await buildSummarizeProgress(state.repo, itemIds);
    return reply.code(201).send(result);
  });

  app.post("/functions/what-should-i-do-next", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const itemIds = parseSynthesisItemIds(body.itemIds);
    if (itemIds.length === 0) {
      return reply.code(400).send({ message: "itemIds must include at least one item" });
    }

    const items = await Promise.all(itemIds.map((itemId) => state.repo.getBrainItemById(itemId)));
    const ownedItems = items.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (ownedItems.length !== itemIds.length) {
      return reply.code(404).send({ message: "Brain item not found" });
    }
    assertScopedItemOwnership(currentUser.id, ownedItems.map((item) => item.userId));
    const result = await buildWhatShouldIDoNext(state.repo, itemIds);
    return reply.code(201).send(result);
  });

  app.get("/functions/founder-review", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const parsedQuery = parseFounderReviewQuery((request.query ?? {}) as Record<string, unknown>);
    const requestedUserId = parsedQuery.userId ?? currentUser.id;
    if (!canAccessUser(currentUser, requestedUserId)) {
      return reply.code(404).send({ message: "Founder review not found" });
    }
    const review = await buildFounderReviewForFunction({
      repo: state.repo,
      userId: requestedUserId,
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
    const requestedUserId = parsedQuery.userId ?? currentUser.id;
    if (!canAccessUser(currentUser, requestedUserId)) {
      return reply.code(404).send({ message: "Founder review not found" });
    }
    const diagnostics = await buildFounderReviewDiagnostics({
      repo: state.repo,
      userId: requestedUserId,
      window: parsedQuery.window,
      includeAi: parsedQuery.includeAi
    });
    return reply.code(200).send(diagnostics);
  });

  app.post("/functions/sessions/:id/pause", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const { id } = request.params as { id: string };
    const existingSession = await state.repo.getSessionById(id);
    if (!existingSession) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    const task = await state.repo.getTaskById(existingSession.taskId);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }

    const result = await buildPauseSessionResult(state, id);
    if (!result.session) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    return reply.code(200).send(result.session);
  });

  app.post("/functions/tasks/:id/start", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const { id } = request.params as { id: string };
    const task = await state.repo.getTaskById(id);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Task not found" });
    }

    const result = await buildStartSessionResult(state, id);
    if (!result.session) {
      return reply.code(404).send({ message: "Task not found" });
    }
    return reply.code(201).send(result.session);
  });

  app.get("/functions/sessions/:id/diagnostics", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const { id } = request.params as { id: string };
    const session = await state.repo.getSessionById(id);
    if (!session) {
      return reply.code(404).send({ message: "Session not found" });
    }
    const task = await state.repo.getTaskById(session.taskId);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Session not found" });
    }
    const diagnostics = await buildSessionDiagnostics(state, id);
    if (!diagnostics) {
      return reply.code(404).send({ message: "Session not found" });
    }
    return reply.code(200).send(diagnostics);
  });
}
