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
};

type RelatedQueryOptions = RelatedDetectionOptions & {
  recentDays?: number;
};

type RelatedRepository = {
  getBrainItemById: (id: string) => Promise<BrainItemRecord | null>;
  listBrainItemsByUser: (userId: string) => Promise<BrainItemRecord[]>;
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

type ScoredCandidate = {
  candidate: BrainItemRecord;
  score: number;
  sharedKeywords: string[];
  sharedPhrases: string[];
  topicMatch: boolean;
  sourceMatch: boolean;
  recencyBoost: number;
};

export function detectRelatedItems(
  target: BrainItemRecord,
  candidates: BrainItemRecord[],
  options: RelatedDetectionOptions = {}
): RelatedCaptureItem[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 5;
  const targetKeywords = toKeywords(target);
  const targetPhrases = toPhrases(targetKeywords);
  const targetTopic = normalizedTopic(target.topicGuess);
  const targetSourceHost = toSourceHost(target.sourceLink);

  const scored: ScoredCandidate[] = candidates
    .filter((candidate) => candidate.id !== target.id)
    .map((candidate) => {
      const candidateKeywords = toKeywords(candidate);
      const candidatePhrases = toPhrases(candidateKeywords);
      const sharedKeywords = [...targetKeywords].filter((keyword) => candidateKeywords.has(keyword));
      const sharedPhrases = [...targetPhrases].filter((phrase) => candidatePhrases.has(phrase));
      const topicMatch = targetTopic !== null && targetTopic === normalizedTopic(candidate.topicGuess);
      const sourceMatch = targetSourceHost !== null && targetSourceHost === toSourceHost(candidate.sourceLink);
      const recencyBoost = scoreRecency(candidate.createdAt, now);
      const keywordJaccard = scoreSetOverlap(targetKeywords, candidateKeywords);
      const phraseJaccard = scoreSetOverlap(targetPhrases, candidatePhrases);
      const keywordScore = Math.min(3, sharedKeywords.length * 0.65);
      const phraseScore = Math.min(2, sharedPhrases.length * 0.8);
      const score =
        (topicMatch ? 3.5 : 0) +
        keywordScore +
        keywordJaccard * 4 +
        phraseScore +
        phraseJaccard * 2 +
        (sourceMatch ? 1.2 : 0) +
        recencyBoost;
      return {
        candidate,
        score,
        sharedKeywords,
        sharedPhrases,
        topicMatch,
        sourceMatch,
        recencyBoost
      };
    })
    .filter((entry) => entry.score >= 2.1)
    .sort((a, b) => b.score - a.score || b.candidate.createdAt.localeCompare(a.candidate.createdAt));

  return scored.slice(0, limit).map((entry) => ({
    id: entry.candidate.id,
    title: entry.candidate.title,
    topicGuess: entry.candidate.topicGuess ?? null,
    score: Number(entry.score.toFixed(3)),
    reason: buildReason(entry)
  }));
}

export async function getRelatedItems(repo: RelatedRepository, itemId: string, options: RelatedQueryOptions = {}): Promise<RelatedCaptureItem[]> {
  const target = await repo.getBrainItemById(itemId);
  if (!target) return [];
  const now = options.now ?? new Date();
  const recentDays = options.recentDays ?? 14;
  const candidateItems = (await repo.listBrainItemsByUser(target.userId)).filter((candidate) => {
    if (candidate.id === target.id) return false;
    const topicMatches = normalizedTopic(candidate.topicGuess) !== null && normalizedTopic(candidate.topicGuess) === normalizedTopic(target.topicGuess);
    const hasKeywordOverlap = hasTokenOverlap(target, candidate);
    const isRecent = isWithinRecentWindow(candidate.createdAt, now, recentDays);
    return topicMatches || hasKeywordOverlap || isRecent;
  });
  return detectRelatedItems(target, candidateItems, { now, limit: options.limit });
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
    if (token.length < 3 || STOPWORDS.has(token)) continue;
    keywords.add(token);
  }
  return keywords;
}

function toPhrases(tokens: Set<string>): Set<string> {
  const list = [...tokens].slice(0, 20);
  const phrases = new Set<string>();
  for (let index = 0; index < list.length - 1; index += 1) {
    const left = list[index];
    const right = list[index + 1];
    if (!left || !right) continue;
    phrases.add(`${left} ${right}`);
  }
  return phrases;
}

function scoreSetOverlap(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

function hasTokenOverlap(left: BrainItemRecord, right: BrainItemRecord): boolean {
  return scoreSetOverlap(toKeywords(left), toKeywords(right)) >= 0.08;
}

function isWithinRecentWindow(createdAt: string, now: Date, recentDays: number): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  const diffMs = now.getTime() - createdMs;
  return diffMs <= recentDays * 24 * 3_600_000;
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

function toSourceHost(sourceLink: string | null | undefined): string | null {
  if (!sourceLink) return null;
  try {
    return new URL(sourceLink).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function buildReason(entry: ScoredCandidate): string {
  const reasons: string[] = [];
  if (entry.topicMatch) {
    reasons.push("Same topic thread.");
  }
  if (entry.sourceMatch) {
    reasons.push("Same source context.");
  }
  if (entry.sharedPhrases.length > 0) {
    reasons.push(`Shared phrasing: ${entry.sharedPhrases.slice(0, 1).join(", ")}.`);
  } else if (entry.sharedKeywords.length > 0) {
    reasons.push(`Shared keywords: ${entry.sharedKeywords.slice(0, 2).join(", ")}.`);
  }
  if (entry.recencyBoost >= 1) {
    reasons.push("Captured recently.");
  }
  if (reasons.length === 0) {
    reasons.push("Adjacent context and timing.");
  }
  return reasons.slice(0, 2).join(" ");
}
