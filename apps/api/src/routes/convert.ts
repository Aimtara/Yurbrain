import type { FastifyInstance } from "fastify";
import { AiConvertRequestSchema, AiConvertResponseSchema } from "../../../../packages/contracts/src";
import { convertToTaskDecision } from "../services/tasks/convert";
import type { AppState } from "../state";

export async function registerConvertRoutes(app: FastifyInstance, state: AppState) {
  app.post("/ai/convert", async (request, reply) => {
    const payload = AiConvertRequestSchema.parse(request.body);
    const decision = convertToTaskDecision(payload);

    if (decision.outcome === "create_task") {
      await state.repo.createTask(decision.task);
    }

    return reply.code(201).send(AiConvertResponseSchema.parse(decision));
  });
}
