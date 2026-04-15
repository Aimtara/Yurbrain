import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  UpdateUserPreferenceRequestSchema,
  UserPreferenceResponseSchema
} from "../../../../packages/contracts/src";
import type { AppState } from "../state";

const UserIdParamSchema = z.object({ userId: z.string().uuid() }).strict();

export async function registerPreferenceRoutes(app: FastifyInstance, state: AppState) {
  app.get("/preferences/:userId", async (request, reply) => {
    const { userId } = UserIdParamSchema.parse(request.params);
    const stored = await state.repo.getUserPreference(userId);

    const response = UserPreferenceResponseSchema.parse(
      stored ?? {
        userId,
        defaultLens: "all",
        cleanFocusMode: true,
        founderMode: false,
        renderMode: "focus",
        aiSummaryMode: "balanced",
        feedDensity: "comfortable",
        resurfacingIntensity: "balanced",
        updatedAt: new Date().toISOString()
      }
    );

    return reply.code(200).send(response);
  });

  app.put("/preferences/:userId", async (request, reply) => {
    const { userId } = UserIdParamSchema.parse(request.params);
    const payload = UpdateUserPreferenceRequestSchema.parse(request.body);
    const updated = await state.repo.upsertUserPreference(userId, payload);
    return reply.code(200).send(UserPreferenceResponseSchema.parse(updated));
  });
}
