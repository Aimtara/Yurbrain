import type { FastifyInstance } from "fastify";
import {
  FounderReviewQuerySchema,
  FounderReviewResponseSchema
} from "../../../../packages/contracts/src";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { buildFounderReview } from "../services/founder-review/service";
import type { AppState } from "../state";

export async function registerFounderReviewRoutes(app: FastifyInstance, state: AppState) {
  app.get("/founder-review", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;

    const { window, userId, includeAi } = FounderReviewQuerySchema.parse(request.query ?? {});
    const resolvedUserId = userId ?? currentUser.id;
    if (!canAccessUser(currentUser, resolvedUserId)) {
      return reply.code(404).send({ message: "Founder review not found" });
    }
    const review = await buildFounderReview({
      repo: state.repo,
      userId: resolvedUserId,
      window,
      now: new Date(),
      includeAi
    });
    reply.header("Cache-Control", "no-store");
    return FounderReviewResponseSchema.parse(review);
  });
}
