import { decodeGroundedAiContext } from "./context";
import type { AiEnvelope } from "./validate";

const PREVIEW_LIMIT = 160;

function compactPreview(input: string): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= PREVIEW_LIMIT) {
    return compact;
  }

  return `${compact.slice(0, PREVIEW_LIMIT - 1)}…`;
}

export function buildSummaryFallback(rawContent: string): AiEnvelope {
  const grounded = decodeGroundedAiContext(rawContent);
  const preview = compactPreview(grounded?.primaryText ?? rawContent);
  const context = grounded?.context;
  const changed = typeof context?.changed === "string" ? compactPreview(context.changed) : preview;
  const done = typeof context?.done === "string" ? compactPreview(context.done) : "No linked completion signal yet";
  const blocked = typeof context?.blocked === "string" ? compactPreview(context.blocked) : "No active blocker signal";
  const nextMove =
    typeof context?.nextMove === "string" ? compactPreview(context.nextMove) : "Open this item and leave one continuation note";
  return {
    content: `Changed: ${changed}. Done: ${done}. Blocked: ${blocked}. Next: ${nextMove}.`,
    confidence: 0.4,
    metadata: { source: "deterministic_fallback", strategy: "grounded_summary" }
  };
}

export function buildClassificationFallback(rawContent: string): AiEnvelope {
  const lowered = rawContent.toLowerCase();
  const label = lowered.includes("?") ? "question" : "note";

  return {
    content: label,
    confidence: 0.35,
    metadata: { source: "deterministic_fallback", strategy: "keyword", label }
  };
}

export function buildQueryFallback(question: string): AiEnvelope {
  const grounded = decodeGroundedAiContext(question);
  const context = grounded?.context;
  const recommendation =
    typeof context?.recommendation === "string" ? compactPreview(context.recommendation) : "Continue the clearest open item";
  const reason =
    typeof context?.reason === "string" ? compactPreview(context.reason) : "It has the strongest continuity signal right now";
  const nextMove =
    typeof context?.nextMove === "string" ? compactPreview(context.nextMove) : "Open it now and complete one 10-minute step";
  return {
    content: `Recommendation: ${recommendation}. Reason: ${reason}. Next move: ${nextMove}.`,
    confidence: 0.3,
    metadata: { source: "deterministic_fallback", strategy: "grounded_next_action" }
  };
}
