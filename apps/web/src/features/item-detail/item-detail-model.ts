import type { BrainItemDto, ItemArtifactDto } from "../shared/types";

const promptStopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "about",
  "into",
  "have",
  "has",
  "were",
  "been",
  "what",
  "when",
  "where"
]);

export function deriveArtifactHistory(artifacts: ItemArtifactDto[]): { summary: string[]; classification: string[] } {
  const summary = artifacts.filter((artifact) => artifact.type === "summary").map((artifact) => deriveArtifactText(artifact.payload));
  const classification = artifacts.filter((artifact) => artifact.type === "classification").map((artifact) => deriveArtifactText(artifact.payload));
  return { summary, classification };
}

function deriveArtifactText(payload: Record<string, unknown>): string {
  if (typeof payload.content === "string" && payload.content.trim().length > 0) {
    return payload.content;
  }
  if (Array.isArray(payload.labels) && payload.labels.every((label) => typeof label === "string")) {
    return `Labels: ${payload.labels.join(", ")}`;
  }
  if (typeof payload.rationale === "string" && payload.rationale.trim().length > 0) {
    return payload.rationale;
  }
  return JSON.stringify(payload);
}

function tokenizeForSimilarity(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !promptStopWords.has(token));
}

export function buildRelatedItems(currentItem: BrainItemDto | null, items: BrainItemDto[]): Array<{ id: string; title: string; hint: string }> {
  if (!currentItem) return [];

  const currentTokens = new Set(tokenizeForSimilarity(`${currentItem.title} ${currentItem.rawContent}`));
  const candidates = items
    .filter((item) => item.id !== currentItem.id)
    .map((item) => {
      const tokens = tokenizeForSimilarity(`${item.title} ${item.rawContent}`);
      const overlap = tokens.filter((token) => currentTokens.has(token));
      return {
        id: item.id,
        title: item.title,
        overlapCount: overlap.length,
        hint: overlap[0] ? `Shares context around "${overlap[0]}"` : "Resurfaces adjacent thinking",
        updatedAt: item.updatedAt
      };
    })
    .sort((left, right) => {
      if (right.overlapCount !== left.overlapCount) return right.overlapCount - left.overlapCount;
      return right.updatedAt.localeCompare(left.updatedAt);
    });

  return candidates.slice(0, 3).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    hint: candidate.hint
  }));
}

export function buildSuggestedPrompts(item: BrainItemDto, nextStep?: string): string[] {
  const prompts = [
    `Summarize progress on "${item.title}".`,
    `What should I do next on "${item.title}"? Give one recommendation, one reason, and one next move.`,
    nextStep ? `Sharpen this next move into one action with one reason: ${nextStep}` : `Give one 10-minute action for "${item.title}" with one reason.`
  ];

  return Array.from(new Set(prompts)).slice(0, 3);
}
