import type { FastifyInstance } from "fastify";
import { ManualConvertTaskRequestSchema } from "../../../../packages/contracts/src";
import { createTaskFromManualContent } from "../services/tasks/manual-convert";
import type { AppState } from "../state";

export async function registerTaskRoutes(app: FastifyInstance, state: AppState) {
  app.post("/tasks/manual-convert", async (request, reply) => {
    const payload = ManualConvertTaskRequestSchema.parse(request.body);
    const task = createTaskFromManualContent(payload);

    state.tasks.set(task.id, task);
    return reply.code(201).send(task);
  });
}
