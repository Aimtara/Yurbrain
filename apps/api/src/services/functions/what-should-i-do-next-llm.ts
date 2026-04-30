import type { FastifyBaseLogger } from "fastify";
import type { DbRepository } from "@yurbrain/db";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { invokeLlm, LlmProviderError } from "../ai/provider";
import { synthesizeFromItems } from "../ai/synthesis";
import { buildWhatShouldIDoNextPrompt } from "./what-should-i-do-next-prompt";
import {
  classifyLlmFallback,
  type LlmFallbackReason,
  FALLBACK_REASON_ORDER,
  toFallbackReason
} from "./llm-fallback";
import {
  isGenericOrHallucinatorySummary,
  validateGroundedSignalQuality,
  validateSingleActionNextStepOutput
} from "./llm-output-quality";

const NextStepResponseSchema = z
  .object({
    summary: z.string().min(1),
    suggestedNextStep: z.string().min(1),
    sourceSignals: z.array(z.string().min(1)).min(1).max(4),
    reason: z.string().min(1),
    confidence: z.number().min(0).max(1)
  })
  .strict();

type SynthesisFallback = Awaited<ReturnType<typeof synthesizeFromItems>>;
type BrainItem = NonNullable<Awaited<ReturnType<DbRepository["getBrainItemById"]>>>;
type Task = Awaited<ReturnType<DbRepository["listTasks"]>>[number];
type Session = Awaited<ReturnType<DbRepository["listSessions"]>>[number];
type Message = Awaited<ReturnType<DbRepository["listMessagesByThread"]>>[number];
type Artifact = Awaited<ReturnType<DbRepository["listArtifactsByItem"]>>[number];

export type WhatShouldIDoNextResult = SynthesisFallback & {
  sourceSignals?: string[];
  usedFallback?: boolean;
  fallbackReason?: LlmFallbackReason;
  confidence?: number;
  cacheHit?: boolean;
};

function compact(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function clamp(input: string, max: number): string {
  const value = compact(input);
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

function extractArtifactContent(payload: Record<string, unknown>): string | null {
  const content = payload.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }
  return null;
}

function parseModelNextStep(raw: string): z.infer<typeof NextStepResponseSchema> | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    const validated = NextStepResponseSchema.parse(parsed);
    return {
      summary: clamp(validated.summary, 220),
      suggestedNextStep: clamp(validated.suggestedNextStep, 220),
      sourceSignals: validated.sourceSignals.map((signal) => clamp(signal, 160)).slice(0, 4),
      reason: clamp(validated.reason, 220),
      confidence: Math.max(0, Math.min(1, validated.confidence))
    };
  } catch {
    return null;
  }
}

function parseProviderNextStepWithQuality(raw: string): ParsedNextStep | null {
  const parsed = parseModelNextStep(raw);
  if (!parsed) return null;
  if (isGenericOrHallucinatorySummary(parsed.summary)) return null;
  const hasGroundedSignals = validateGroundedSignalQuality(parsed.sourceSignals, {
    minSignals: 1,
    maxSignals: 4,
    maxSignalLength: 160
  });
  if (!hasGroundedSignals) return null;
  const hasSingleActionStep = validateSingleActionNextStepOutput(parsed.suggestedNextStep, 220);
  if (!hasSingleActionStep) return null;
  return parsed;
}

type ParsedNextStep = NonNullable<ReturnType<typeof parseModelNextStep>>;

const CACHE_KIND = "what_should_i_do_next_cache";

function buildConversationTurns(messages: Array<{ role: string; content: string; createdAt: string }>) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, 3)
    .reverse()
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: clamp(message.content, 220),
      createdAt: message.createdAt
    }));
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.entries(nested as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)));
  });
}

function fingerprintContext(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function parseCachedResult(payload: Record<string, unknown>, fingerprint: string): WhatShouldIDoNextResult | null {
  if (payload.kind !== CACHE_KIND || payload.fingerprint !== fingerprint) return null;
  const result = payload.result;
  if (!result || typeof result !== "object") return null;
  const cached = result as Partial<WhatShouldIDoNextResult>;
  if (typeof cached.summary !== "string" || typeof cached.suggestedNextAction !== "string" || typeof cached.reason !== "string") {
    return null;
  }
  return { ...(cached as WhatShouldIDoNextResult), cacheHit: true };
}

async function buildPromptGrounding(
  repo: DbRepository,
  itemIds: string[],
  deterministic: SynthesisFallback
) {
  const uniqueItemIds = [...new Set(itemIds)];
  const items = (
    await Promise.all(uniqueItemIds.map((itemId) => repo.getBrainItemById(itemId)))
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const users = [...new Set(items.map((item) => item.userId))];
  const tasks = (
    await Promise.all(users.map((userId) => repo.listTasks({ userId })))
  )
    .flat()
    .filter((task) => task.sourceItemId && uniqueItemIds.includes(task.sourceItemId));

  const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));
  const sessions = (
    await Promise.all(tasks.map((task) => repo.listSessions({ taskId: task.id })))
  ).flat();

  const artifactRows = await Promise.all(
    items.map((item) => repo.listArtifactsByItem(item.id, { type: "summary" }))
  );
  const messageRows = await Promise.all(
    items.map(async (item) => {
      const itemThreads = await repo.listThreads(item.id);
      const messages = await Promise.all(itemThreads.map((thread) => repo.listMessagesByThread(thread.id)));
      return messages.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    })
  );

  const promptItems = items.map((item, index) => {
    const latestSummary = [...artifactRows[index]]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((artifact) => extractArtifactContent(artifact.payload))
      .find((value): value is string => Boolean(value)) ?? null;

    const recentTurns = buildConversationTurns(messageRows[index]);
    const latestContinuation =
      [...recentTurns].reverse().find((message) => message.role === "user")?.content ?? null;

    return {
      id: item.id,
      title: clamp(item.title, 140),
      snippet: clamp(item.rawContent, 220),
      updatedAt: item.updatedAt,
      topicGuess: item.topicGuess ?? null,
      latestSummary: latestSummary ? clamp(latestSummary, 220) : null,
      latestContinuation: latestContinuation ? clamp(latestContinuation, 220) : null,
      recentTurns
    };
  });

  return {
    itemIds: uniqueItemIds,
    items: promptItems,
    linkedTasks: tasks
      .slice(0, 6)
      .map((task) => ({
        title: clamp(task.title, 140),
        status: task.status,
        updatedAt: task.updatedAt,
        sourceItemId: task.sourceItemId ?? null
      })),
    linkedSessions: sessions
      .slice(0, 6)
      .map((session) => ({
        taskTitle: clamp(taskTitleById.get(session.taskId) ?? "Linked task", 140),
        state: session.state,
        startedAt: session.startedAt
      })),
    sourceSignals: [
      ...(deterministic.repeatedIdeas ?? []),
      deterministic.reason,
      ...promptItems.map((item) => item.latestContinuation ?? item.snippet)
    ]
      .filter((value): value is string => Boolean(value))
      .slice(0, 6)
      .map((signal) => clamp(signal, 160)),
    deterministicSuggestion: clamp(deterministic.suggestedNextAction, 220),
    deterministicReason: clamp(deterministic.reason, 220)
  };
}

async function buildGroundingBundle(repo: DbRepository, itemIds: string[], deterministic: SynthesisFallback) {
  const grounding = await buildPromptGrounding(repo, itemIds, deterministic);
  const uniqueItemIds = [...new Set(itemIds)];
  const items = (
    await Promise.all(uniqueItemIds.map((itemId) => repo.getBrainItemById(itemId)))
  ).filter((item): item is BrainItem => Boolean(item));
  const users = [...new Set(items.map((item) => item.userId))];
  const tasks = (
    await Promise.all(users.map((userId) => repo.listTasks({ userId })))
  )
    .flat()
    .filter((task) => task.sourceItemId && uniqueItemIds.includes(task.sourceItemId)) as Task[];
  const sessions = (await Promise.all(tasks.map((task) => repo.listSessions({ taskId: task.id })))).flat() as Session[];
  const messages = (
    await Promise.all(
      items.map(async (item) => {
        const threads = await repo.listThreads(item.id);
        return (await Promise.all(threads.map((thread) => repo.listMessagesByThread(thread.id)))).flat();
      })
    )
  ).flat() as Message[];
  const artifacts = (await Promise.all(items.map((item) => repo.listArtifactsByItem(item.id, { type: "summary" })))).flat() as Artifact[];
  const fingerprint = fingerprintContext({
    kind: CACHE_KIND,
    itemIds: uniqueItemIds,
    items: items.map((item) => ({ id: item.id, title: item.title, rawContent: item.rawContent, updatedAt: item.updatedAt, status: item.status })),
    tasks: tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, updatedAt: task.updatedAt })),
    sessions: sessions.map((session) => ({ id: session.id, taskId: session.taskId, state: session.state, startedAt: session.startedAt, endedAt: session.endedAt })),
    messages: messages.map((message) => ({ id: message.id, role: message.role, content: clamp(message.content, 220), createdAt: message.createdAt })),
    artifacts: artifacts
      .filter((artifact) => artifact.payload.kind !== CACHE_KIND)
      .map((artifact) => ({ id: artifact.id, type: artifact.type, createdAt: artifact.createdAt, confidence: artifact.confidence }))
  });
  return { grounding, fingerprint, anchorItemId: items[0]?.id ?? null };
}

async function readCachedResult(repo: DbRepository, anchorItemId: string | null, fingerprint: string): Promise<WhatShouldIDoNextResult | null> {
  if (!anchorItemId) return null;
  const artifacts = await repo.listArtifactsByItem(anchorItemId, { type: "summary" });
  for (const artifact of artifacts) {
    const cached = parseCachedResult(artifact.payload, fingerprint);
    if (cached) return cached;
  }
  return null;
}

async function writeCachedResult(repo: DbRepository, anchorItemId: string | null, fingerprint: string, itemIds: string[], result: WhatShouldIDoNextResult) {
  if (!anchorItemId) return;
  await repo.createArtifact({
    id: randomUUID(),
    itemId: anchorItemId,
    type: "summary",
    payload: {
      kind: CACHE_KIND,
      itemIds,
      fingerprint,
      result: {
        summary: result.summary,
        repeatedIdeas: result.repeatedIdeas,
        suggestedNextAction: result.suggestedNextAction,
        reason: result.reason,
        sourceSignals: result.sourceSignals,
        usedFallback: result.usedFallback,
        fallbackReason: result.fallbackReason,
        confidence: result.confidence
      }
    },
    confidence: result.usedFallback ? 0.35 : result.confidence ?? 0.7,
    createdAt: new Date().toISOString()
  });
}

function buildFallbackResponse(
  deterministic: SynthesisFallback,
  reason: LlmFallbackReason
): WhatShouldIDoNextResult {
  return {
    ...deterministic,
    sourceSignals: [
      ...(deterministic.repeatedIdeas ?? []),
      deterministic.reason
    ]
      .slice(0, 4)
      .map((value) => clamp(value, 160)),
    usedFallback: true,
    fallbackReason: reason,
    confidence: 0.35
  };
}

export async function buildWhatShouldIDoNextWithLlm(
  repo: DbRepository,
  itemIds: string[],
  options: {
    log?: FastifyBaseLogger;
    correlationId?: string;
    timeoutMs?: number;
  } = {}
): Promise<WhatShouldIDoNextResult> {
  const startedAt = Date.now();
  const deterministic = await synthesizeFromItems(repo, itemIds, "next_step");
  try {
    const { grounding, fingerprint, anchorItemId } = await buildGroundingBundle(repo, itemIds, deterministic);
    const cached = await readCachedResult(repo, anchorItemId, fingerprint);
    if (cached) {
      options.log?.info(
        {
          event: "what_should_i_do_next_cache_hit",
          correlationId: options.correlationId,
          itemCount: grounding.items.length
        },
        "what should i do next cache hit"
      );
      return cached;
    }
    const prompt = buildWhatShouldIDoNextPrompt(grounding);
    options.log?.info(
      {
        event: "what_should_i_do_next_llm_started",
        correlationId: options.correlationId,
        itemCount: grounding.items.length,
        timeoutMs: options.timeoutMs
      },
      "what should i do next llm started"
    );

    const llm = await invokeLlm({
      instruction: prompt.instruction,
      context: prompt.groundedContext,
      taskClass: "next_step",
      timeoutMs: options.timeoutMs
    });
    const parsed = parseProviderNextStepWithQuality(llm.text);
    if (!parsed) {
      const parseFallbackReason = toFallbackReason("invalid_response");
      options.log?.warn(
        {
          event: "what_should_i_do_next_llm_fallback",
          correlationId: options.correlationId,
          fallbackReason: parseFallbackReason,
          fallbackStage: "parse",
          fallbackOrder: FALLBACK_REASON_ORDER[parseFallbackReason],
          errorCode: "invalid_response",
          durationMs: Date.now() - startedAt
        },
        "what should i do next llm parse failed"
      );
      return buildFallbackResponse(deterministic, parseFallbackReason);
    }

    options.log?.info(
      {
        event: "what_should_i_do_next_llm_completed",
        correlationId: options.correlationId,
        provider: llm.provider,
        model: llm.model,
        durationMs: Date.now() - startedAt,
        providerLatencyMs: llm.latencyMs
      },
      "what should i do next llm completed"
    );

    const result = toProviderResponse(parsed, deterministic);
    await writeCachedResult(repo, anchorItemId, fingerprint, grounding.itemIds, result);
    return result;
  } catch (error) {
    const fallbackStage =
      error instanceof LlmProviderError
        ? error.code === "invalid_response"
          ? "parse"
          : "invoke"
        : "grounding";
    const classified = classifyLlmFallback(error, fallbackStage);
    const fallbackReason = classified.fallbackReason;

    options.log?.warn(
      {
        event: "what_should_i_do_next_llm_fallback",
        correlationId: options.correlationId,
        fallbackReason,
        fallbackStage: classified.fallbackStage,
        fallbackOrder: FALLBACK_REASON_ORDER[fallbackReason],
        errorCode: classified.providerErrorCode ?? "unknown",
        errorName: classified.errorName,
        durationMs: Date.now() - startedAt
      },
      "what should i do next llm fallback used"
    );
    return buildFallbackResponse(deterministic, fallbackReason);
  }
}

function toProviderResponse(
  parsed: ParsedNextStep,
  deterministic: SynthesisFallback
): WhatShouldIDoNextResult {
  return {
    summary: parsed.summary,
    repeatedIdeas: deterministic.repeatedIdeas,
    suggestedNextAction: parsed.suggestedNextStep,
    reason: parsed.reason,
    sourceSignals: parsed.sourceSignals,
    usedFallback: false,
    confidence: parsed.confidence,
    cacheHit: false
  };
}
