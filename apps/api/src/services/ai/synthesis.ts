import type { BrainItemRecord } from "../../state";

type RepoLike = {
  getBrainItemById: (id: string) => Promise<BrainItemRecord | null>;
};

type SynthesisMode = "cluster_summary" | "next_step";

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "from",
  "have",
  "into",
  "just",
  "only",
  "that",
  "there",
  "these",
  "they",
  "this",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

function compact(input: string, max = 180): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normalizeTopic(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toKeywords(items: BrainItemRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const source = [item.title, item.rawContent, item.topicGuess ?? "", item.previewTitle ?? "", item.previewDescription ?? ""].join(" ");
    for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length < 4 || STOPWORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token);
}

function inferTheme(items: BrainItemRecord[]): string {
  const topicCounts = new Map<string, number>();
  for (const item of items) {
    const topic = normalizeTopic(item.topicGuess);
    if (!topic) continue;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const rankedTopics = [...topicCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (rankedTopics[0]) return rankedTopics[0][0];
  const keywords = toKeywords(items);
  if (keywords.length === 0) return "Connected captures";
  return keywords.slice(0, 2).map((token) => token[0]?.toUpperCase() + token.slice(1)).join(" ");
}

function inferNextAction(items: BrainItemRecord[], theme: string): { suggestedNextAction: string; reason: string } {
  const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const anchor = sorted[0];
  if (!anchor) {
    return {
      suggestedNextAction: "Re-open one capture and add a single continuation note.",
      reason: "A concrete continuation note restores context with minimal effort."
    };
  }
  const action = `Re-open "${compact(anchor.title, 96)}" and add one concrete next move for ${theme.toLowerCase()} in 10 minutes.`;
  const reason = `It is the most recently touched capture in this thread and keeps the same theme grounded.`;
  return {
    suggestedNextAction: action,
    reason: compact(reason, 220)
  };
}

function buildSummary(items: BrainItemRecord[], repeatedIdeas: string[], theme: string, mode: SynthesisMode): string {
  const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const latest = sorted[0];
  const lines = [
    `Theme: ${theme}.`,
    `${items.length} captures are connected in this thread.`,
    latest ? `Most recent context: "${compact(latest.title, 120)}".` : null,
    repeatedIdeas.length > 0 ? `Repeated ideas: ${repeatedIdeas.join(", ")}.` : null
  ].filter((line): line is string => Boolean(line));

  if (mode === "next_step") {
    const primary = lines[0] ?? "These captures connect around one theme.";
    return `- ${compact(primary, 220)}`;
  }
  return lines.slice(0, 5).map((line) => `- ${compact(line, 220)}`).join("\n");
}

export async function synthesizeFromItems(
  repo: RepoLike,
  itemIds: string[],
  mode: SynthesisMode
): Promise<{
  summary: string;
  repeatedIdeas?: string[];
  suggestedNextAction: string;
  reason: string;
}> {
  const uniqueIds = [...new Set(itemIds)];
  const fetched = await Promise.all(uniqueIds.map((id) => repo.getBrainItemById(id)));
  const items = fetched.filter((item): item is BrainItemRecord => Boolean(item));
  if (items.length === 0) {
    return {
      summary: "No item context found for synthesis.",
      suggestedNextAction: "Capture one concrete detail, then retry synthesis.",
      reason: "Grounded suggestions require at least one saved item."
    };
  }

  const theme = inferTheme(items);
  const repeatedIdeas = toKeywords(items).slice(0, 3);
  const nextAction = inferNextAction(items, theme);
  return {
    summary: buildSummary(items, repeatedIdeas, theme, mode),
    repeatedIdeas: repeatedIdeas.length > 0 ? repeatedIdeas : undefined,
    suggestedNextAction: nextAction.suggestedNextAction,
    reason: nextAction.reason
  };
}
