import type { StoredFeedCard } from "../apps/api/src/services/feed/static-feed";
import { rankFeedCards } from "../apps/api/src/services/feed/rank";
import {
  buildClassificationFallback,
  buildQueryFallback,
  buildSummaryFallback
} from "@yurbrain/ai";

export type AiRunnerInput = {
  mode: "rankFeed" | "summarize" | "classify" | "query";
  feedCards?: StoredFeedCard[];
  lens?: StoredFeedCard["lens"];
  text?: string;
};

export type AiRunnerOutput =
  | { mode: "rankFeed"; rankedCardIds: string[] }
  | { mode: "summarize" | "classify" | "query"; content: string; confidence: number; strategy?: string };

/**
 * Nhost function stub for reusing deterministic ranking + fallback behavior
 * while migrating logic out of `apps/api`.
 */
export async function aiRunner(input: AiRunnerInput): Promise<AiRunnerOutput> {
  switch (input.mode) {
    case "rankFeed": {
      const ranked = rankFeedCards(input.feedCards ?? [], { lens: input.lens });
      return {
        mode: "rankFeed",
        rankedCardIds: ranked.map((entry) => entry.card.id)
      };
    }
    case "summarize": {
      const envelope = buildSummaryFallback(input.text ?? "");
      return {
        mode: "summarize",
        content: envelope.content,
        confidence: envelope.confidence,
        strategy: String(envelope.metadata?.strategy ?? "deterministic_fallback")
      };
    }
    case "classify": {
      const envelope = buildClassificationFallback(input.text ?? "");
      return {
        mode: "classify",
        content: envelope.content,
        confidence: envelope.confidence,
        strategy: String(envelope.metadata?.strategy ?? "deterministic_fallback")
      };
    }
    case "query": {
      const envelope = buildQueryFallback(input.text ?? "");
      return {
        mode: "query",
        content: envelope.content,
        confidence: envelope.confidence,
        strategy: String(envelope.metadata?.strategy ?? "deterministic_fallback")
      };
    }
  }
}
