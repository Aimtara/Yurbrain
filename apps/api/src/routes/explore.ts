import type { FastifyInstance } from "fastify";
import {
  ExploreConnectionPreviewRequestSchema,
  ExploreConnectionPreviewResponseSchema,
  ExploreConnectionSaveRequestSchema,
  ExploreConnectionSaveResponseSchema
} from "@yurbrain/contracts";
import { requireCurrentUser } from "../middleware/current-user";
import { sendSafeErrorResponse } from "../middleware/observability";
import { previewExploreConnection, loadOwnedSourceItems, saveExploreConnection } from "../services/explore/connections";
import type { AppState } from "../state";

export async function registerExploreRoutes(app: FastifyInstance, state: AppState) {
  app.post("/explore/connections/preview", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = ExploreConnectionPreviewRequestSchema.parse(request.body);
    const sourceItems = await loadOwnedSourceItems(state, currentUser.id, payload.sourceItemIds);
    const result = sourceItems ? previewExploreConnection(sourceItems, payload.mode) : null;
    if (!result) {
      return reply.code(404).send({ message: "Source items not found" });
    }
    return reply.code(200).send(ExploreConnectionPreviewResponseSchema.parse(result));
  });

  app.post("/explore/connections/save", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = ExploreConnectionSaveRequestSchema.parse(request.body);
    if (!payload.candidate) {
      return reply.code(400).send({ message: "Connection candidate is required" });
    }
    const sourceItems = await loadOwnedSourceItems(state, currentUser.id, payload.sourceItemIds);
    const savePayload = {
      userId: currentUser.id,
      sourceItemIds: payload.sourceItemIds,
      mode: payload.mode,
      candidate: payload.candidate
    };
    let result;
    try {
      result = sourceItems ? await saveExploreConnection(state, savePayload, sourceItems) : null;
    } catch (error) {
      return sendSafeErrorResponse(request, reply, {
        statusCode: 500,
        message: error instanceof Error ? `${error.name}: ${error.message}` : "Explore save failed",
        code: "EXPLORE_SAVE_FAILED"
      });
    }
    if (!result) {
      return reply.code(404).send({ message: "Source items not found" });
    }
    return reply.code(201).send(ExploreConnectionSaveResponseSchema.parse(result));
  });
}
