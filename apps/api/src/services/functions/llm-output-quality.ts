type GroundingItem = {
  title: string;
  snippet: string;
  latestSummary?: string | null;
  latestContinuation?: string | null;
};

type GroundingTask = {
  title: string;
};

type GroundingSession = {
  taskTitle: string;
};

export type OutputQualityIssue =
  | "summary_not_grounded"
  | "reason_not_grounded"
  | "next_step_not_grounded"
  | "next_step_not_single_action"
  | "next_step_generic"
  | "summary_too_many_sentences";

type QualityCheckResult = {
  ok: boolean;
  issues: OutputQualityIssue[];
};

type SharedGrounding = {
  items: GroundingItem[];
  linkedTasks: GroundingTask[];
  linkedSessions: GroundingSession[];
  sourceSignals: string[];
  deterministicSuggestion?: string;
  deterministicReason?: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "could",
  "from",
  "have",
  "just",
  "maybe",
  "more",
  "most",
  "only",
  "over",
  "same",
  "some",
  "that",
  "their",
  "there",
  "these",
  "this",
  "those",
  "through",
  "until",
  "very",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would"
]);

const GENERIC_NEXT_STEP_PATTERNS = [
  /\bkeep going\b/i,
  /\bstay focused\b/i,
  /\bdo your best\b/i,
  /\bmake progress\b/i,
  /\bwork on it\b/i,
  /\bmove forward\b/i,
  /\bcontinue working\b/i
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function sentenceCount(value: string): number {
  const matches = normalizeWhitespace(value).match(/[.!?](\s|$)/g);
  if (!matches || matches.length === 0) return 1;
  return matches.length;
}

function buildGroundingVocabulary(grounding: SharedGrounding): Set<string> {
  const values = [
    ...grounding.items.flatMap((item) => [
      item.title,
      item.snippet,
      item.latestSummary ?? "",
      item.latestContinuation ?? ""
    ]),
    ...grounding.linkedTasks.map((task) => task.title),
    ...grounding.linkedSessions.map((session) => session.taskTitle),
    ...grounding.sourceSignals,
    grounding.deterministicSuggestion ?? "",
    grounding.deterministicReason ?? ""
  ];
  const tokens = values.flatMap((value) => tokenize(value));
  return new Set(tokens);
}

function hasGroundingOverlap(text: string, groundingVocabulary: Set<string>): boolean {
  const tokens = tokenize(text);
  return tokens.some((token) => groundingVocabulary.has(token));
}

function isSingleAction(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (normalized.length === 0) return false;
  if (/[;\n]/.test(normalized)) return false;
  if (/\b(first|second|third|finally)\b/i.test(normalized)) return false;
  if (/\bthen\b/i.test(normalized)) return false;
  if (/\bafter that\b/i.test(normalized)) return false;
  return true;
}

function isGenericNextStep(text: string): boolean {
  return GENERIC_NEXT_STEP_PATTERNS.some((pattern) => pattern.test(text));
}

export function assessSummarizeProgressOutputQuality(
  output: {
    summary: string;
    suggestedNextStep: string;
    reason: string;
  },
  grounding: SharedGrounding
): QualityCheckResult {
  const vocabulary = buildGroundingVocabulary(grounding);
  const issues: OutputQualityIssue[] = [];

  if (sentenceCount(output.summary) > 3) {
    issues.push("summary_too_many_sentences");
  }
  if (!hasGroundingOverlap(output.summary, vocabulary)) {
    issues.push("summary_not_grounded");
  }
  if (!hasGroundingOverlap(output.reason, vocabulary)) {
    issues.push("reason_not_grounded");
  }
  if (!hasGroundingOverlap(output.suggestedNextStep, vocabulary)) {
    issues.push("next_step_not_grounded");
  }
  if (!isSingleAction(output.suggestedNextStep)) {
    issues.push("next_step_not_single_action");
  }
  if (isGenericNextStep(output.suggestedNextStep)) {
    issues.push("next_step_generic");
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

export function assessWhatShouldIDoNextOutputQuality(
  output: {
    summary: string;
    suggestedNextStep: string;
    reason: string;
  },
  grounding: SharedGrounding
): QualityCheckResult {
  const vocabulary = buildGroundingVocabulary(grounding);
  const issues: OutputQualityIssue[] = [];

  if (sentenceCount(output.summary) > 1) {
    issues.push("summary_too_many_sentences");
  }
  if (!hasGroundingOverlap(output.summary, vocabulary)) {
    issues.push("summary_not_grounded");
  }
  if (!hasGroundingOverlap(output.reason, vocabulary)) {
    issues.push("reason_not_grounded");
  }
  if (!hasGroundingOverlap(output.suggestedNextStep, vocabulary)) {
    issues.push("next_step_not_grounded");
  }
  if (!isSingleAction(output.suggestedNextStep)) {
    issues.push("next_step_not_single_action");
  }
  if (isGenericNextStep(output.suggestedNextStep)) {
    issues.push("next_step_generic");
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
