import type { FastifyInstance } from "fastify";
import { AiConvertRequestSchema, AiConvertResponseSchema } from "../../../../packages/contracts/src";
import { requireCurrentUser } from "../middleware/current-user";
import { convertToTaskDecision } from "../services/tasks/convert";
import type { AppState } from "../state";

export async function registerConvertRoutes(app: FastifyInstance, state: AppState) {
  app.post("/ai/convert", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = AiConvertRequestSchema.parse(request.body);
    const decision = convertToTaskDecision({ ...payload, userId: currentUser.id });

    if (decision.outcome === "task_created") {
      await state.repo.createTask(decision.task);
    }

    return reply.code(201).send(AiConvertResponseSchema.parse(decision));
  });
}
