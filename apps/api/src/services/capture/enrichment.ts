import type { CaptureIntakeRequest } from "../../../../../packages/contracts/src";

type EnrichmentResult = {
  contentType: "text" | "link" | "image";
  title: string;
  rawContent: string;
  source: string | null;
  sourceApp: string | null;
  sourceLink: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewImageUrl: string | null;
  note: string | null;
  topicGuess: string | null;
  recencyWeight: number;
  clusterKey: string | null;
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
  const canonicalContent = extractCanonicalContent(payload, contentType);
  const note = normalizeText(payload.note);
  const source = normalizeSource(payload.source);
  const sourceLink = resolveSourceLink(payload, contentType, canonicalContent);
  const sourceApp = resolveSourceApp(payload.source, sourceLink);
  const rawContent = canonicalContent ?? "(empty capture)";
  const rawForInference = [canonicalContent, note, source, sourceLink, payload.preview?.title, payload.preview?.description].filter(Boolean).join(" ");

  let previewTitle = normalizeText(payload.preview?.title);
  let previewDescription = normalizeText(payload.preview?.description);
  let previewImageUrl = normalizeText(payload.preview?.imageUrl) ?? (contentType === "image" ? canonicalContent : null);

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
  const recencyWeight = inferRecencyWeight(contentType);
  const clusterKey = topicGuess ? toClusterKey(topicGuess) : null;
  const title = buildCaptureTitle({
    contentType,
    text: canonicalContent,
    previewTitle,
    sourceApp,
    topicGuess
  });

  return {
    contentType,
    title,
    rawContent,
    source,
    sourceApp,
    sourceLink,
    previewTitle,
    previewDescription,
    previewImageUrl,
    note,
    topicGuess,
    recencyWeight,
    clusterKey,
    fallbackUsed,
    warnings
  };
}

function resolveContentType(payload: CaptureIntakeRequest): "text" | "link" | "image" {
  if (payload.type) return payload.type;
  if (looksLikeImageUrl(payload.content)) return "image";
  if (looksLikeUrl(payload.content)) return "link";
  if (payload.image) return "image";
  if (payload.link) return "link";
  return "text";
}

function extractCanonicalContent(payload: CaptureIntakeRequest, contentType: "text" | "link" | "image"): string | null {
  const explicit = normalizeText(payload.content);
  if (explicit) return explicit;
  if (contentType === "link") {
    return normalizeText(payload.link) ?? normalizeText(payload.text);
  }
  if (contentType === "image") {
    return normalizeText(payload.image) ?? normalizeText(payload.text);
  }
  return normalizeText(payload.text) ?? normalizeText(payload.link) ?? normalizeText(payload.image);
}

function normalizeSource(source: CaptureIntakeRequest["source"]): string | null {
  if (!source) return null;
  if (typeof source === "string") {
    const normalized = normalizeText(source);
    return normalized ? truncate(normalized, 500) : null;
  }
  const fromApp = normalizeText(source.app);
  if (fromApp) return truncate(fromApp, 500);
  const fromLink = normalizeText(source.link);
  return fromLink ? truncate(fromLink, 500) : null;
}

function resolveSourceLink(
  payload: CaptureIntakeRequest,
  contentType: "text" | "link" | "image",
  canonicalContent: string | null
): string | null {
  if (typeof payload.source === "object" && payload.source) {
    const sourceLink = normalizeText(payload.source.link);
    if (sourceLink) return sourceLink;
  }
  if (contentType === "link" && canonicalContent) {
    return canonicalContent;
  }
  return normalizeText(payload.link);
}

function resolveSourceApp(source: CaptureIntakeRequest["source"], sourceLink: string | null): string | null {
  if (typeof source === "string") {
    if (!looksLikeUrl(source)) {
      const normalized = normalizeText(source);
      return normalized ? truncate(normalized, 80) : null;
    }
  }
  if (typeof source === "object" && source) {
    const sourceApp = normalizeText(source.app);
    if (sourceApp) return truncate(sourceApp, 80);
  }
  return inferSourceApp(sourceLink);
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

function looksLikeUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value.trim());
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(" ");
}
