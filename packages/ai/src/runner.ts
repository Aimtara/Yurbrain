import { decodeGroundedAiContext } from "./context";
import type { AiEnvelope } from "./validate";

export type AiRunnerInput = {
  task: "summarize" | "classify" | "query";
  content: string;
  timeoutMs?: number;
};

export type AiRunner = {
  run: (input: AiRunnerInput) => Promise<unknown>;
};

const DEFAULT_TIMEOUT_MS = 800;
const CLAUSE_LIMIT = 92;

function compactPreview(input: string, limit = CLAUSE_LIMIT): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, Math.max(1, limit - 1))}…`;
}

function normalizeClause(input: string, fallback: string): string {
  const compact = compactPreview(input);
  const value = compact.length > 0 ? compact : fallback;
  return value.replace(/[.?!\s]+$/, "");
}

function getStringContext(context: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = context?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isNextActionPrompt(input: string): boolean {
  const normalized = input.toLowerCase();
  return /what should i do next|what next|next step|do next|next move/.test(normalized);
}

function buildSummaryContent(primaryText: string, context?: Record<string, unknown>): string {
  const changed = normalizeClause(
    getStringContext(context, "changed") ?? compactPreview(primaryText),
    "No meaningful change captured yet"
  );
  const done = normalizeClause(getStringContext(context, "done") ?? "No linked completion signal yet", "No linked completion signal yet");
  const blocked = normalizeClause(getStringContext(context, "blocked") ?? "No active blocker signal", "No active blocker signal");
  const nextMove = normalizeClause(
    getStringContext(context, "nextMove") ?? "Open this item and leave one continuation note",
    "Open this item and leave one continuation note"
  );
  return `Changed: ${changed}. Done: ${done}. Blocked: ${blocked}. Next: ${nextMove}.`;
}

function buildQueryContent(primaryText: string, context?: Record<string, unknown>): string {
  const recommendation = normalizeClause(
    getStringContext(context, "recommendation") ?? "Continue the clearest open item",
    "Continue the clearest open item"
  );
  const reason = normalizeClause(
    getStringContext(context, "reason") ?? "It has the strongest continuity signal right now",
    "It has the strongest continuity signal right now"
  );
  const nextMove = normalizeClause(
    getStringContext(context, "nextMove") ?? "Open it now and complete one 10-minute step",
    "Open it now and complete one 10-minute step"
  );
  const intent = getStringContext(context, "intent");
  if (intent === "next_action" || isNextActionPrompt(primaryText)) {
    return `Recommendation: ${recommendation}. Reason: ${reason}. Next move: ${nextMove}.`;
  }

  const contextHint = normalizeClause(
    getStringContext(context, "itemTitle") ?? getStringContext(context, "contextHint") ?? compactPreview(primaryText),
    compactPreview(primaryText)
  );
  return `Context: ${contextHint}. Recommendation: ${recommendation}. Next move: ${nextMove}.`;
}

function createDeterministicProvider(): AiRunner {
  return {
    async run(input) {
      const grounded = decodeGroundedAiContext(input.content);
      const primaryText = grounded?.primaryText ?? input.content;
      const context = grounded?.context;

      if (primaryText.includes("[force-invalid]")) {
        return { invalid: true };
      }

      if (primaryText.includes("[force-timeout]")) {
        await new Promise((resolve) => setTimeout(resolve, (input.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 25));
      }

      const content =
        input.task === "summarize"
          ? buildSummaryContent(primaryText, context)
          : input.task === "query"
            ? buildQueryContent(primaryText, context)
            : `CLASSIFY: ${primaryText.slice(0, 120)}`;

      const base: AiEnvelope = {
        content,
        confidence: grounded ? 0.82 : 0.76,
        metadata: { source: "deterministic_provider", grounded: Boolean(grounded) }
      };

      return base;
    }
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI runner timed out")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function runAiTask(input: AiRunnerInput, provider: AiRunner = createDeterministicProvider()): Promise<unknown> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return withTimeout(provider.run(input), timeoutMs);
}
