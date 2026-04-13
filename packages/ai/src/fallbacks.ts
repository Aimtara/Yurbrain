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
  const preview = compactPreview(rawContent);
  return {
    content: `Fallback summary: ${preview}`,
    confidence: 0.4,
    metadata: { source: "deterministic_fallback", strategy: "preview" }
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
  return {
    content: `I couldn't complete the AI query safely, so here's a deterministic fallback. Question received: ${compactPreview(question)}`,
    confidence: 0.3,
    metadata: { source: "deterministic_fallback", strategy: "echo" }
  };
}
