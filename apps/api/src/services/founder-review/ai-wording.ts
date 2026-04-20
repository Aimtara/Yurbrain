import type { FounderReviewResponse } from "@yurbrain/contracts";
import { synthesizeFromItems } from "../ai/synthesis";
import type { DbRepository } from "@yurbrain/db";

type BuildFounderReviewAiWordingOptions = {
  repo: DbRepository;
  userId: string;
  review: FounderReviewResponse;
  maxItems?: number;
};

export async function buildFounderReviewAiWording({
  repo,
  userId,
  review,
  maxItems = 6
}: BuildFounderReviewAiWordingOptions): Promise<FounderReviewResponse["aiReadout"]> {
  const items = await repo.listBrainItemsByUser(userId);
  const candidateIds = items
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((item) => item.id)
    .slice(0, maxItems);

  const synthesis = await synthesizeFromItems(repo, candidateIds, "next_step");
  const weak = review.currentReadout.weakestArea.label.toLowerCase();
  const risk = review.currentReadout.mainRisk.title.toLowerCase();

  return {
    summary:
      synthesis.summary && synthesis.summary.trim().length > 0
        ? synthesis.summary
        : `Weakest loop area is ${weak}. Main risk is ${risk}.`,
    recommendedNextMoveWording:
      synthesis.suggestedNextAction && synthesis.suggestedNextAction.trim().length > 0
        ? synthesis.suggestedNextAction
        : review.currentReadout.recommendedNextMove.detail,
    groundingNote: "AI wording is optional; deterministic Founder Review scores and flags remain source of truth."
  };
}
