import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import {
  CreateTaskRequestSchema,
  ListTasksQuerySchema,
  ManualConvertTaskRequestSchema,
  TaskListResponseSchema,
  TaskResponseSchema,
  UpdateTaskRequestSchema
} from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { createTaskFromManualContent } from "../services/tasks/manual-convert";
import type { AppState } from "../state";

export async function registerTaskRoutes(app: FastifyInstance, state: AppState) {
  app.post("/tasks/manual-convert", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = ManualConvertTaskRequestSchema.parse(request.body);
    const sourceItem = await state.repo.getBrainItemById(payload.sourceItemId);
    if (!sourceItem || !canAccessUser(currentUser, sourceItem.userId)) {
      return reply.code(404).send({ message: "Source item not found" });
    }
    const task = createTaskFromManualContent({ ...payload, userId: currentUser.id });

    await state.repo.createTask(task);
    return reply.code(201).send(TaskResponseSchema.parse(task));
  });

  app.post("/tasks", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = CreateTaskRequestSchema.parse(request.body);
    if (payload.sourceItemId) {
      const sourceItem = await state.repo.getBrainItemById(payload.sourceItemId);
      if (!sourceItem || !canAccessUser(currentUser, sourceItem.userId)) {
        return reply.code(404).send({ message: "Source item not found" });
      }
    }
    const now = new Date().toISOString();

    const task = {
      id: randomUUID(),
      userId: currentUser.id,
      sourceItemId: payload.sourceItemId ?? null,
      sourceMessageId: payload.sourceMessageId ?? null,
      title: payload.title.trim(),
      status: "todo" as const,
      createdAt: now,
      updatedAt: now
    };

    await state.repo.createTask(task);
    return reply.code(201).send(TaskResponseSchema.parse(task));
  });

  app.get("/tasks/:id", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const task = await state.repo.getTaskById(id);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Task not found" });
    }

    return reply.code(200).send(TaskResponseSchema.parse(task));
  });

  app.patch("/tasks/:id", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const existing = await state.repo.getTaskById(id);
    if (!existing || !canAccessUser(currentUser, existing.userId)) {
      return reply.code(404).send({ message: "Task not found" });
    }

    const payload = UpdateTaskRequestSchema.parse(request.body);
    const updated = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString()
    };

    await state.repo.updateTask(id, {
      title: updated.title,
      status: updated.status,
      sourceItemId: updated.sourceItemId,
      sourceMessageId: updated.sourceMessageId,
      updatedAt: updated.updatedAt
    });
    return reply.code(200).send(TaskResponseSchema.parse(updated));
  });

  app.get("/tasks", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const query = ListTasksQuerySchema.parse(request.query ?? {});
    const filtered = await state.repo.listTasks({ ...query, userId: currentUser.id });

    return reply.code(200).send(TaskListResponseSchema.parse(filtered));
  });
}
