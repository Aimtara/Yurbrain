import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import {
  CreateTaskRequestSchema,
  ListTasksQuerySchema,
  ManualConvertTaskRequestSchema,
  TaskListResponseSchema,
  TaskResponseSchema,
  UpdateTaskRequestSchema
} from "../../../../packages/contracts/src";
import { createTaskFromManualContent } from "../services/tasks/manual-convert";
import type { AppState } from "../state";

export async function registerTaskRoutes(app: FastifyInstance, state: AppState) {
  app.post("/tasks/manual-convert", async (request, reply) => {
    const payload = ManualConvertTaskRequestSchema.parse(request.body);
    const task = createTaskFromManualContent(payload);

    state.tasks.set(task.id, task);
    return reply.code(201).send(TaskResponseSchema.parse(task));
  });

  app.post("/tasks", async (request, reply) => {
    const payload = CreateTaskRequestSchema.parse(request.body);
    const now = new Date().toISOString();

    const task = {
      id: randomUUID(),
      userId: payload.userId,
      sourceItemId: payload.sourceItemId ?? null,
      sourceMessageId: payload.sourceMessageId ?? null,
      title: payload.title.trim(),
      status: "todo" as const,
      createdAt: now,
      updatedAt: now
    };

    state.tasks.set(task.id, task);
    return reply.code(201).send(TaskResponseSchema.parse(task));
  });

  app.get("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = state.tasks.get(id);
    if (!task) {
      return reply.code(404).send({ message: "Task not found" });
    }

    return reply.code(200).send(TaskResponseSchema.parse(task));
  });

  app.patch("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = state.tasks.get(id);
    if (!existing) {
      return reply.code(404).send({ message: "Task not found" });
    }

    const payload = UpdateTaskRequestSchema.parse(request.body);
    const updated = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString()
    };

    state.tasks.set(id, updated);
    return reply.code(200).send(TaskResponseSchema.parse(updated));
  });

  app.get("/tasks", async (request, reply) => {
    const query = ListTasksQuerySchema.parse(request.query ?? {});
    const filtered = Array.from(state.tasks.values()).filter((task) => {
      if (query.userId && task.userId !== query.userId) return false;
      if (query.status && task.status !== query.status) return false;
      return true;
    });

    return reply.code(200).send(TaskListResponseSchema.parse(filtered));
  });
}
