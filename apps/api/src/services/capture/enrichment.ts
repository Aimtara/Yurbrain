import type { CaptureIntakeRequest } from "@yurbrain/contracts";

type EnrichmentResult = {
  contentType: "text" | "link" | "image";
  title: string;
  rawContent: string;
  sourceApp: string | null;
  sourceLink: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewImageUrl: string | null;
  topicGuess: string | null;
  clusterKey: string | null;
  recencyWeight: number;
  fallbackUsed: boolean;
  warnings: string[];
};

const TOPIC_HINTS: Array<{ topic: string; keywords: string[] }> = [
  { topic: "Product", keywords: ["feature", "roadmap", "launch", "feedback", "ux"] },
  { topic: "Engineering", keywords: ["api", "backend", "frontend", "migration", "bug", "incident"] },
  { topic: "Growth", keywords: ["seo", "acquisition", "campaign", "signup", "conversion"] },
  { topic: "Operations", keywords: ["process", "handoff", "oncall", "runbook", "support"] },
  { topic: "Finance", keywords: ["invoice", "billing", "revenue", "budget", "cost"] }
];

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "could",
  "first",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "most",
  "only",
  "over",
  "that",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "very",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

export function enrichCapture(payload: CaptureIntakeRequest): EnrichmentResult {
  const warnings: string[] = [];
  let fallbackUsed = false;

  const contentType = resolveContentType(payload);
  const sourceFromPayload = parseSourcePayload(payload.source);
  const sourceLink = sourceFromPayload.sourceLink ?? payload.link?.trim() ?? (contentType === "link" ? normalizeText(payload.content) : null);
  const sourceApp = sourceFromPayload.sourceApp ?? inferSourceApp(sourceLink);

  const normalizedContent = normalizeText(payload.content);
  const textContent = normalizeText(payload.text) ?? (contentType === "text" ? normalizedContent : null);
  const imageContent = normalizeText(payload.image) ?? (contentType === "image" ? normalizedContent : null);
  const rawContent = textContent ?? sourceLink ?? imageContent ?? "(empty capture)";
  const rawForInference = [textContent, sourceLink, payload.preview?.title, payload.preview?.description, payload.note].filter(Boolean).join(" ");

  let previewTitle = normalizeText(payload.preview?.title);
  let previewDescription = normalizeText(payload.preview?.description);
  let previewImageUrl = normalizeText(payload.preview?.imageUrl) ?? (contentType === "image" ? imageContent : null);

  if (sourceLink) {
    try {
      const parsed = new URL(sourceLink);
      const host = parsed.hostname.replace(/^www\./i, "");
      const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
      const normalizedSegment = decodeURIComponent(lastSegment).replace(/[-_]+/g, " ").trim();
      previewTitle = previewTitle ?? toTitleCase(normalizedSegment || host);
      previewDescription = previewDescription ?? `Saved from ${host}`;
      previewImageUrl = previewImageUrl ?? null;
    } catch {
      fallbackUsed = true;
      warnings.push("source_link_parse_failed");
      previewTitle = previewTitle ?? "Saved link";
      previewDescription = previewDescription ?? "Link preview unavailable.";
    }
  }

  const topicGuess = normalizeText(payload.topicGuess) ?? inferTopicGuess(rawForInference);
  const clusterKey = topicGuess ? toClusterKey(topicGuess) : null;
  const recencyWeight = inferRecencyWeight(contentType);
  const title = buildCaptureTitle({
    contentType,
    text: textContent,
    previewTitle,
    sourceApp,
    topicGuess
  });

  return {
    contentType,
    title,
    rawContent,
    sourceApp,
    sourceLink,
    previewTitle,
    previewDescription,
    previewImageUrl,
    topicGuess,
    clusterKey,
    recencyWeight,
    fallbackUsed,
    warnings
  };
}

function resolveContentType(payload: CaptureIntakeRequest): "text" | "link" | "image" {
  if (payload.type) return payload.type;
  if (payload.content) {
    const normalized = payload.content.trim();
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(normalized)) return "image";
    if (/^https?:\/\//i.test(normalized)) return "link";
  }
  if (payload.image) return "image";
  if (payload.link) return "link";
  return "text";
}

function parseSourcePayload(source: CaptureIntakeRequest["source"]): { sourceApp: string | null; sourceLink: string | null } {
  if (!source) return { sourceApp: null, sourceLink: null };
  if (typeof source === "string") {
    const normalized = source.trim();
    if (!normalized) return { sourceApp: null, sourceLink: null };
    if (/^https?:\/\//i.test(normalized)) {
      return { sourceApp: null, sourceLink: normalized };
    }
    return { sourceApp: normalized, sourceLink: null };
  }
  return {
    sourceApp: normalizeText(source.app),
    sourceLink: source.link?.trim() ?? null
  };
}

function buildCaptureTitle(input: {
  contentType: "text" | "link" | "image";
  text: string | null;
  previewTitle: string | null;
  sourceApp: string | null;
  topicGuess: string | null;
}): string {
  const candidate =
    input.previewTitle ??
    input.topicGuess ??
    (input.text ? input.text.replace(/\s+/g, " ").trim() : null) ??
    input.sourceApp ??
    (input.contentType === "image" ? "Saved image" : "Captured note");
  return truncate(candidate, 120);
}

function inferTopicGuess(rawText: string): string | null {
  const lowered = rawText.toLowerCase();
  for (const hint of TOPIC_HINTS) {
    if (hint.keywords.some((keyword) => lowered.includes(keyword))) {
      return hint.topic;
    }
  }
  const keywords = extractKeywords(rawText);
  if (keywords.length === 0) return null;
  return toTitleCase(keywords.slice(0, 2).join(" "));
}

function inferSourceApp(link: string | null): string | null {
  if (!link) return null;
  try {
    const hostname = new URL(link).hostname.replace(/^www\./i, "");
    const domain = hostname.split(".")[0];
    return domain ? toTitleCase(domain) : null;
  } catch {
    return null;
  }
}

function inferRecencyWeight(contentType: "text" | "link" | "image"): number {
  if (contentType === "text") return 1;
  if (contentType === "image") return 0.9;
  return 0.85;
}

function toClusterKey(topicGuess: string): string {
  return topicGuess
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const token of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 4 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token);
}

function truncate(value: string, max: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trimEnd()}...`;
}

function normalizeText(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(" ");
}
