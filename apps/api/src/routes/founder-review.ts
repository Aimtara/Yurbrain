import type { FastifyInstance } from "fastify";
import {
  FounderReviewQuerySchema,
  FounderReviewResponseSchema
} from "../../../../packages/contracts/src";
import { buildFounderReview } from "../services/founder-review/service";
import type { AppState } from "../state";

const defaultUserId = "11111111-1111-1111-1111-111111111111";

export async function registerFounderReviewRoutes(app: FastifyInstance, state: AppState) {
  app.get("/founder-review", async (request, reply) => {
    const { window, userId, includeAi } = FounderReviewQuerySchema.parse(request.query ?? {});
    const resolvedUserId = userId ?? defaultUserId;
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
