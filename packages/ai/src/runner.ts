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
const LIVE_CONTENT_LIMIT = 420;

type Environment = Record<string, string | undefined>;

export type OpenAiProviderOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_TIMEOUT_MS = 10_000;

function compactPreview(input: string, limit = CLAUSE_LIMIT): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, Math.max(1, limit - 1))}…`;
}

function normalizeBaseUrl(raw: string | undefined): string {
  const candidate = raw?.trim() || "https://api.openai.com/v1";
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
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

function createPromptForTask(input: AiRunnerInput): string {
  if (input.task === "summarize") {
    return [
      "You are Yurbrain's summarizer.",
      "Return exactly one concise sentence (max 220 chars).",
      "Focus on changed, done, blocked, next.",
      "No markdown, no bullets."
    ].join(" ");
  }
  if (input.task === "query") {
    return [
      "You are Yurbrain's next-step assistant.",
      "Return exactly one concise recommendation sentence (max 220 chars).",
      "Be concrete and actionable.",
      "No markdown, no bullets."
    ].join(" ");
  }
  return [
    "Classify the content with exactly one lowercase label.",
    "Prefer: note, question, idea, link, task, reference.",
    "No punctuation."
  ].join(" ");
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

export function createDeterministicProvider(): AiRunner {
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

async function runOpenAiChatCompletion(options: OpenAiProviderOptions, input: AiRunnerInput): Promise<unknown> {
  const body = {
    model: options.model ?? DEFAULT_OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: createPromptForTask(input)
      },
      {
        role: "user",
        content: compactPreview(input.content, 1_800)
      }
    ]
  };

  const response = await withTimeout(
    fetch(`${normalizeBaseUrl(options.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify(body)
    }),
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI provider error: ${response.status} ${errorBody}`);
  }

  const parsed = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = parsed.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI provider returned empty content");
  }
  return {
    content: compactPreview(content, LIVE_CONTENT_LIMIT),
    confidence: 0.74,
    metadata: {
      source: "openai_provider",
      model: parsed.model ?? options.model ?? DEFAULT_OPENAI_MODEL
    }
  };
}

export function createOpenAiProvider(options: OpenAiProviderOptions): AiRunner {
  return {
    run(input) {
      return runOpenAiChatCompletion(options, input);
    }
  };
}

export function resolveAiProviderFromEnv(env: Environment = process.env): AiRunner | null {
  const provider = env.YURBRAIN_AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.OPENAI_API_KEY?.trim() ?? env.YURBRAIN_OPENAI_API_KEY?.trim();

  if (!provider || provider === "deterministic") {
    return null;
  }
  if (provider === "openai") {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when YURBRAIN_AI_PROVIDER=openai");
    }
    return createOpenAiProvider({
      apiKey,
      model: env.OPENAI_MODEL?.trim() || env.YURBRAIN_OPENAI_MODEL?.trim() || undefined,
      baseUrl: env.OPENAI_BASE_URL?.trim() || env.YURBRAIN_OPENAI_BASE_URL?.trim() || undefined
    });
  }

  throw new Error(`Unsupported YURBRAIN_AI_PROVIDER value: ${provider}`);
}

export function createConfiguredProvider(options: { env?: Environment } = {}): AiRunner {
  return resolveAiProviderFromEnv(options.env ?? process.env) ?? createDeterministicProvider();
}

export function isLiveAiProviderConfigured(): boolean {
  try {
    return Boolean(resolveAiProviderFromEnv());
  } catch {
    return false;
  }
}

export async function runAiTask(input: AiRunnerInput, provider?: AiRunner): Promise<unknown> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const selectedProvider = provider ?? createConfiguredProvider();
  return withTimeout(selectedProvider.run(input), timeoutMs);
}
