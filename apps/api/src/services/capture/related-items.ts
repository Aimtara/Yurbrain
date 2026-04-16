import type { BrainItemRecord } from "../../state";

export type RelatedCaptureItem = {
  id: string;
  title: string;
  topicGuess: string | null;
  score: number;
  reason: string;
};

type RelatedDetectionOptions = {
  now?: Date;
  limit?: number;
  recentWindowDays?: number;
};

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "between",
  "does",
  "from",
  "have",
  "into",
  "just",
  "only",
  "that",
  "them",
  "then",
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

export function detectRelatedItems(
  target: BrainItemRecord,
  candidates: BrainItemRecord[],
  options: RelatedDetectionOptions = {}
): RelatedCaptureItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 5;
  const recentWindowDays = options.recentWindowDays ?? 14;
  const recentCutoffMs = now.getTime() - recentWindowDays * 24 * 3_600_000;
  const targetKeywords = toKeywords(target);

  const scored = candidates
    .filter((candidate) => candidate.id !== target.id)
    .map((candidate) => {
      const candidateKeywords = toKeywords(candidate);
      const sharedKeywords = [...targetKeywords].filter((keyword) => candidateKeywords.has(keyword));
      const topicMatch = normalizedTopic(target.topicGuess) !== null && normalizedTopic(target.topicGuess) === normalizedTopic(candidate.topicGuess);
      const createdAtMs = new Date(candidate.createdAt).getTime();
      const isRecent = Number.isFinite(createdAtMs) && createdAtMs >= recentCutoffMs;
      const recencyBoost = scoreRecency(candidate.createdAt, now);
      const keywordScore = Math.min(4, sharedKeywords.length);
      const score = (topicMatch ? 4 : 0) + keywordScore + recencyBoost;
      return {
        candidate,
        score,
        sharedKeywords,
        topicMatch,
        isRecent
      };
    })
    .filter((entry) => entry.topicMatch || entry.sharedKeywords.length > 0 || entry.isRecent)
    .filter((entry) => entry.score >= 1.5)
    .sort((a, b) => b.score - a.score || b.candidate.createdAt.localeCompare(a.candidate.createdAt));

  return scored.slice(0, limit).map((entry) => ({
    id: entry.candidate.id,
    title: entry.candidate.title,
    topicGuess: entry.candidate.topicGuess ?? null,
    score: Number(entry.score.toFixed(3)),
    reason: buildReason(entry.topicMatch, entry.sharedKeywords)
  }));
}

export function getRelatedItems(itemId: string, items: BrainItemRecord[], options: RelatedDetectionOptions = {}): string[] {
  const target = items.find((item) => item.id === itemId);
  if (!target) return [];
  return detectRelatedItems(target, items, options).map((item) => item.id);
}

function normalizedTopic(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toKeywords(item: BrainItemRecord): Set<string> {
  const raw = [item.title, item.rawContent, item.topicGuess ?? "", item.previewTitle ?? "", item.previewDescription ?? ""].join(" ");
  const keywords = new Set<string>();
  for (const token of raw.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 4 || STOPWORDS.has(token)) continue;
    keywords.add(token);
  }
  return keywords;
}

function scoreRecency(createdAt: string, now: Date): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  const ageHours = Math.max(0, (now.getTime() - created) / 3_600_000);
  if (ageHours <= 24) return 2;
  if (ageHours <= 72) return 1;
  if (ageHours <= 168) return 0.5;
  return 0;
}

function buildReason(topicMatch: boolean, sharedKeywords: string[]): string {
  if (topicMatch) {
    return "Matching topic guess and close capture timing.";
  }
  if (sharedKeywords.length > 0) {
    const sampled = sharedKeywords.slice(0, 2).join(", ");
    return `Shared keywords: ${sampled}.`;
  }
  return "Recent captures with adjacent context.";
}
