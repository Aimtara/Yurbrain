import type { BrainItemRecord } from "../../state";

export type ClusterSynthesisResult = {
  summary: string;
  repeatedIdeas?: string[];
  suggestedNextAction: string;
  reason: string;
};

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "before",
  "between",
  "could",
  "from",
  "have",
  "into",
  "just",
  "only",
  "some",
  "such",
  "that",
  "there",
  "these",
  "they",
  "this",
  "those",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

type Mode = "summary" | "next_step";

export function synthesizeCluster(items: BrainItemRecord[], mode: Mode): ClusterSynthesisResult {
  const topKeywords = extractTopKeywords(items, 4);
  const repeatedIdeas = topKeywords.length > 0 ? topKeywords.map((keyword) => `Repeated focus on ${keyword}.`) : undefined;
  const summaryLines = items.slice(0, 5).map((item) => summarizeItem(item));
  const summary = mode === "summary" ? summaryLines.map((line) => `- ${line}`).join("\n") : summarizeAsParagraph(summaryLines, topKeywords);
  const suggestedNextAction = buildSuggestedNextAction(topKeywords, items);
  const reason = buildReason(topKeywords, items.length);
  return {
    summary,
    repeatedIdeas,
    suggestedNextAction,
    reason
  };
}

function summarizeItem(item: BrainItemRecord): string {
  const source = item.title.trim().length > 0 ? item.title : "Captured item";
  const snippet = item.rawContent.trim().replace(/\s+/g, " ").slice(0, 92);
  if (!snippet) return source;
  return `${source}: ${snippet}${snippet.length >= 92 ? "..." : ""}`;
}

function summarizeAsParagraph(lines: string[], keywords: string[]): string {
  const compact = lines.slice(0, 3).join(" ");
  if (keywords.length === 0) return compact;
  const lead = `Theme: ${keywords.slice(0, 2).join(", ")}.`;
  return `${lead} ${compact}`.trim();
}

function buildSuggestedNextAction(keywords: string[], items: BrainItemRecord[]): string {
  if (keywords.length > 0) {
    return `Pick one ${keywords[0]} item and add one concrete update today.`;
  }
  const anchor = items[0];
  if (anchor) {
    return `Re-open "${anchor.title}" and capture one next move in a short note.`;
  }
  return "Choose one item and write one concrete next move.";
}

function buildReason(keywords: string[], itemCount: number): string {
  if (keywords.length > 0) {
    return `This action is grounded in repeated ${keywords[0]} patterns across ${itemCount} saved items.`;
  }
  return `This action keeps continuity moving across ${itemCount} related captures without adding extra structure.`;
}

function extractTopKeywords(items: BrainItemRecord[], maxKeywords: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const topic = normalizeToken(item.topicGuess);
    if (topic) {
      counts.set(topic, (counts.get(topic) ?? 0) + 2);
    }
    for (const token of tokenize(`${item.title} ${item.rawContent}`)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxKeywords)
    .map(([token]) => token);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function normalizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
  return normalized.length > 0 ? normalized : null;
}
