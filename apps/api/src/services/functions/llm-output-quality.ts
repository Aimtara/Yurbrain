import type { LlmFallbackReason } from "./llm-fallback";

export type OutputQualityIssue =
  | "signals_not_grounded"
  | "summary_generic"
  | "next_step_not_single_action"
  | "next_step_generic";

const GENERIC_NEXT_STEP_PATTERNS = [
  /\bkeep going\b/i,
  /\bstay focused\b/i,
  /\bdo your best\b/i,
  /\bmake progress\b/i,
  /\bwork on it\b/i,
  /\bmove forward\b/i,
  /\bcontinue working\b/i,
  /\bcontinue improving\b/i
];

const GENERIC_SUMMARY_PATTERNS = [
  /\bkeep making progress\b/i,
  /\bthings are going well\b/i,
  /\bdoing great\b/i,
  /\bgenerally on track\b/i,
  /\bcontinue to improve\b/i,
  /\bhigh level\b/i
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isGenericOrHallucinatorySummary(text: string): boolean {
  return GENERIC_SUMMARY_PATTERNS.some((pattern) => pattern.test(text));
}

export function isGenericNextStep(text: string): boolean {
  return GENERIC_NEXT_STEP_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateSingleActionNextStepOutput(text: string, maxLength = 220): boolean {
  const normalized = normalizeWhitespace(text);
  if (normalized.length === 0) return false;
  if (normalized.length > maxLength) return false;
  if (/[;\n]/.test(normalized)) return false;
  if (/\b(and|then|after that)\b/i.test(normalized)) return false;
  if (/\b(first|second|third|finally)\b/i.test(normalized)) return false;
  if (isGenericNextStep(normalized)) return false;
  return true;
}

export function validateGroundedSignalQuality(
  signals: string[],
  options: {
    minSignals: number;
    maxSignals: number;
    maxSignalLength: number;
  }
): boolean {
  if (signals.length < options.minSignals) return false;
  if (signals.length > options.maxSignals) return false;

  const normalized = signals
    .map((signal) => normalizeWhitespace(signal))
    .filter((signal) => signal.length > 0 && signal.length <= options.maxSignalLength);

  if (normalized.length < options.minSignals) return false;
  if (normalized.length > options.maxSignals) return false;

  // Reject all-generic signal lists; at least one specific signal is required.
  const meaningfulSignals = normalized.filter((signal) => !isGenericNextStep(signal));
  return meaningfulSignals.length >= options.minSignals;
}

export function summarizeProgressQualityIssue(output: {
  summary: string;
  suggestedNextStep: string;
  sourceSignals: string[];
}): OutputQualityIssue | null {
  if (!validateGroundedSignalQuality(output.sourceSignals, { minSignals: 1, maxSignals: 4, maxSignalLength: 160 })) {
    return "signals_not_grounded";
  }
  if (isGenericOrHallucinatorySummary(output.summary)) {
    return "summary_generic";
  }
  if (isGenericNextStep(output.suggestedNextStep)) {
    return "next_step_generic";
  }
  if (!validateSingleActionNextStepOutput(output.suggestedNextStep)) {
    return "next_step_not_single_action";
  }
  return null;
}

export function toQualityIssueFallbackReason(_issue: OutputQualityIssue): LlmFallbackReason {
  return "parse_failed";
}

export function isSingleActionLike(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (normalized.length === 0) return false;
  if (/[;\n]/.test(normalized)) return false;
  if (/\b(first|second|third|finally)\b/i.test(normalized)) return false;
  return true;
}
