import type { FastifyInstance } from "fastify";
import {
  AiArtifactResponseSchema,
  ClassifyItemRequestSchema,
  QueryItemRequestSchema,
  QueryItemResponseSchema,
  SummarizeItemRequestSchema
} from "../../../../packages/contracts/src";
import { classifyItem } from "../services/ai/classify";
import { queryItemAssistant } from "../services/ai/item-query";
import { summarizeItem } from "../services/ai/summarize";
import type { AppState } from "../state";

export async function registerAiRoutes(app: FastifyInstance, state: AppState) {
  app.post("/ai/summarize", async (request, reply) => {
    const payload = SummarizeItemRequestSchema.parse(request.body);
    const result = await summarizeItem(state, payload);

    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/classify", async (request, reply) => {
    const payload = ClassifyItemRequestSchema.parse(request.body);
    const result = await classifyItem(state, payload);

    return reply.code(201).send(AiArtifactResponseSchema.parse(result));
  });

  app.post("/ai/query", async (request, reply) => {
    const payload = QueryItemRequestSchema.parse(request.body);
    const result = await queryItemAssistant(state, payload);
    if (!result) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    return reply.code(201).send(QueryItemResponseSchema.parse(result));
  });
}
