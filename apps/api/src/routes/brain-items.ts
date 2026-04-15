import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  BrainItemResponseSchema,
  NextStepResponseSchema,
  ProgressSummaryResponseSchema,
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

type TaskCandidate = Awaited<ReturnType<AppState["repo"]["listTasksBySourceItem"]>>[number];
type MessageCandidate = Awaited<ReturnType<AppState["repo"]["listMessagesByThread"]>>[number];

function pickTaskForExecution(tasks: TaskCandidate[]): TaskCandidate | null {
  if (tasks.length === 0) return null;
  return tasks.find((task) => task.status === "in_progress") ?? tasks.find((task) => task.status === "todo") ?? tasks[0] ?? null;
}

function pickLatestComment(messages: MessageCandidate[]): MessageCandidate | null {
  const comments = messages.filter((message) => message.role === "user");
  if (comments.length === 0) return null;
  return comments.reduce((latest, current) => (current.createdAt > latest.createdAt ? current : latest));
}

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
      execution: updated.execution,
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

  app.get("/brain-items/:id/progress-summary", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }

    const linkedTasks = await state.repo.listTasksBySourceItem(item.id);
    const activeTask = pickTaskForExecution(linkedTasks);
    const runningSession =
      activeTask
        ? (await state.repo.listSessions({ taskId: activeTask.id, state: "running" }))[0] ?? null
        : null;
    const threads = await state.repo.listThreads(item.id);
    const commentThreads = threads.filter((thread) => thread.kind === "item_comment");
    const commentMessages = (await Promise.all(commentThreads.map((thread) => state.repo.listMessagesByThread(thread.id)))).flat();
    const latestComment = pickLatestComment(commentMessages);

    const generatedSummaryParts: string[] = [];
    if (item.execution?.status && item.execution.status !== "none") {
      generatedSummaryParts.push(`Execution status is ${item.execution.status.replaceAll("_", " ")}.`);
    }
    if (activeTask) {
      generatedSummaryParts.push(`Linked task is ${activeTask.status.replaceAll("_", " ")}.`);
    }
    if (runningSession) {
      generatedSummaryParts.push("A session is currently running.");
    }
    if (latestComment) {
      generatedSummaryParts.push(`Latest continuation note: ${latestComment.content}`);
    }

    const summary = item.execution?.progressSummary?.trim()
      ? item.execution.progressSummary
      : generatedSummaryParts.join(" ").trim() || "No execution progress yet. Add one continuation note to restore momentum.";

    return reply.send(
      ProgressSummaryResponseSchema.parse({
        itemId: item.id,
        summary,
        signals: {
          executionStatus: item.execution?.status,
          linkedTaskStatus: activeTask?.status,
          hasRunningSession: Boolean(runningSession),
          commentCount: commentMessages.length,
          latestCommentAt: latestComment?.createdAt
        }
      })
    );
  });

  app.get("/brain-items/:id/next-step", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await state.repo.getBrainItemById(id);
    if (!item) {
      return reply.code(404).send({ message: "Brain item not found" });
    }

    const linkedTasks = await state.repo.listTasksBySourceItem(item.id);
    const activeTask = pickTaskForExecution(linkedTasks);
    const threads = await state.repo.listThreads(item.id);
    const commentThreads = threads.filter((thread) => thread.kind === "item_comment");
    const commentMessages = (await Promise.all(commentThreads.map((thread) => state.repo.listMessagesByThread(thread.id)))).flat();
    const latestComment = pickLatestComment(commentMessages);

    if (item.execution?.nextStep?.trim()) {
      return reply.send(
        NextStepResponseSchema.parse({
          itemId: item.id,
          nextStep: item.execution.nextStep,
          reason: "Saved execution metadata already includes the smallest next step.",
          source: "execution_metadata"
        })
      );
    }

    if (activeTask?.status === "in_progress") {
      return reply.send(
        NextStepResponseSchema.parse({
          itemId: item.id,
          nextStep: `Resume the active task: ${activeTask.title}.`,
          reason: "Task status shows momentum is already underway.",
          source: "task"
        })
      );
    }

    if (activeTask?.status === "todo") {
      return reply.send(
        NextStepResponseSchema.parse({
          itemId: item.id,
          nextStep: `Start a short session on: ${activeTask.title}.`,
          reason: "A linked task is ready and waiting.",
          source: "task"
        })
      );
    }

    if (latestComment) {
      return reply.send(
        NextStepResponseSchema.parse({
          itemId: item.id,
          nextStep: "Convert your latest continuation note into one lightweight action.",
          reason: "Recent thread activity indicates clear context to act on.",
          source: "thread"
        })
      );
    }

    return reply.send(
      NextStepResponseSchema.parse({
        itemId: item.id,
        nextStep: "Add one continuation note, then choose the smallest action you can start in under 10 minutes.",
        reason: "No active execution signal is available yet.",
        source: "fallback"
      })
    );
  });
}
