import type { FastifyInstance } from "fastify";
import {
  FounderReviewQuerySchema,
  FounderReviewResponseSchema
} from "@yurbrain/contracts";
import { requireCurrentUser } from "../middleware/current-user";
import { buildFounderReview } from "../services/founder-review/service";
import type { AppState } from "../state";

export async function registerFounderReviewRoutes(app: FastifyInstance, state: AppState) {
  app.get("/founder-review", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { window, includeAi } = FounderReviewQuerySchema.parse(request.query ?? {});
    const review = await buildFounderReview({
      repo: state.repo,
      userId: currentUser.id,
      window,
      now: new Date(),
      includeAi
    });
    reply.header("Cache-Control", "no-store");
    return FounderReviewResponseSchema.parse(review);
  });
}
