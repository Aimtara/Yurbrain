import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { UpdateUserPreferenceRequestSchema, UserPreferenceResponseSchema, UserPreferenceMeResponseSchema } from "../../../../packages/contracts/src";
import { requireCurrentUser } from "../middleware/current-user";
import type { AppState } from "../state";

const UserIdParamSchema = z.object({ userId: z.string().uuid() }).strict();

export async function registerPreferenceRoutes(app: FastifyInstance, state: AppState) {
  app.get("/preferences/me", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const stored = await state.repo.getUserPreference(currentUser.id);

    const response = UserPreferenceResponseSchema.parse(
      stored ?? {
        userId: currentUser.id,
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

    return reply.code(200).send(UserPreferenceMeResponseSchema.parse(response));
  });

  app.put("/preferences/me", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const payload = UpdateUserPreferenceRequestSchema.parse(request.body);
    const updated = await state.repo.upsertUserPreference(currentUser.id, payload);
    return reply.code(200).send(UserPreferenceMeResponseSchema.parse(updated));
  });

  app.get("/preferences/:userId", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { userId } = UserIdParamSchema.parse(request.params);
    if (userId !== currentUser.id) {
      return reply.code(403).send({ message: "Cannot access preferences for another user." });
    }
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
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { userId } = UserIdParamSchema.parse(request.params);
    if (userId !== currentUser.id) {
      return reply.code(403).send({ message: "Cannot update preferences for another user." });
    }
    const payload = UpdateUserPreferenceRequestSchema.parse(request.body);
    const updated = await state.repo.upsertUserPreference(userId, payload);
    return reply.code(200).send(UserPreferenceResponseSchema.parse(updated));
  });
}
