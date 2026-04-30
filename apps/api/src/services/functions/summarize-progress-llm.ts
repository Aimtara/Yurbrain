import { createHash, randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { DbRepository } from "@yurbrain/db";
import { z } from "zod";
import { invokeLlm, LlmProviderError } from "../ai/provider";
import { synthesizeFromItems } from "../ai/synthesis";
import { buildSummarizeProgressPrompt } from "./summarize-progress-prompt";
import {
  classifyLlmFallback,
  FALLBACK_REASON_ORDER,
  type LlmFallbackReason
} from "./llm-fallback";
import { summarizeProgressQualityIssue, toQualityIssueFallbackReason } from "./llm-output-quality";

const SummaryResponseSchema = z
  .object({
    summary: z.string().min(1),
    blockers: z.array(z.string().min(1)).max(3).default([]),
    suggestedNextStep: z.string().min(1),
    sourceSignals: z.array(z.string().min(1)).min(1).max(4),
    reason: z.string().min(1)
  })
  .strict();

type SynthesisFallback = Awaited<ReturnType<typeof synthesizeFromItems>>;
type BrainItem = NonNullable<Awaited<ReturnType<DbRepository["getBrainItemById"]>>>;
type Task = Awaited<ReturnType<DbRepository["listTasks"]>>[number];
type Session = Awaited<ReturnType<DbRepository["listSessions"]>>[number];
type Message = Awaited<ReturnType<DbRepository["listMessagesByThread"]>>[number];
type Artifact = Awaited<ReturnType<DbRepository["listArtifactsByItem"]>>[number];

export type SummarizeProgressResult = SynthesisFallback & {
  blockers?: string[];
  sourceSignals?: string[];
  usedFallback?: boolean;
  fallbackReason?: LlmFallbackReason;
  cacheHit?: boolean;
};

type GroundingBundle = {
  grounding: Awaited<ReturnType<typeof buildPromptGrounding>>;
  fingerprint: string;
  anchorItemId: string | null;
};

const CACHE_KIND = "summarize_progress_cache";

function compact(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function clamp(input: string, max: number): string {
  const value = compact(input);
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

function isLikelyBlockerSignal(value: string): boolean {
  return /\b(blocked|stuck|waiting|dependency|approval|review|paused|deferred|postponed)\b/i.test(value);
}

function extractArtifactContent(payload: Record<string, unknown>): string | null {
  const content = payload.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }
  return null;
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractCachedResult(payload: Record<string, unknown>, fingerprint: string): SummarizeProgressResult | null {
  if (payload.kind !== CACHE_KIND || payload.fingerprint !== fingerprint || !isRecord(payload.result)) {
    return null;
  }
  const result = payload.result as Partial<SummarizeProgressResult>;
  if (typeof result.summary !== "string" || typeof result.suggestedNextAction !== "string" || typeof result.reason !== "string") {
    return null;
  }
  return {
    summary: result.summary,
    repeatedIdeas: Array.isArray(result.repeatedIdeas) ? result.repeatedIdeas.filter((value): value is string => typeof value === "string") : undefined,
    suggestedNextAction: result.suggestedNextAction,
    reason: result.reason,
    blockers: Array.isArray(result.blockers) ? result.blockers.filter((value): value is string => typeof value === "string") : undefined,
    sourceSignals: Array.isArray(result.sourceSignals) ? result.sourceSignals.filter((value): value is string => typeof value === "string") : undefined,
    usedFallback: Boolean(result.usedFallback),
    fallbackReason: result.fallbackReason,
    cacheHit: true
  };
}

async function readCachedResult(repo: DbRepository, anchorItemId: string | null, fingerprint: string): Promise<SummarizeProgressResult | null> {
  if (!anchorItemId) return null;
  const artifacts = await repo.listArtifactsByItem(anchorItemId, { type: "summary" });
  for (const artifact of artifacts) {
    const cached = extractCachedResult(artifact.payload, fingerprint);
    if (cached) return cached;
  }
  return null;
}

async function writeCachedResult(repo: DbRepository, anchorItemId: string | null, fingerprint: string, itemIds: string[], result: SummarizeProgressResult) {
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
        blockers: result.blockers,
        sourceSignals: result.sourceSignals,
        usedFallback: result.usedFallback,
        fallbackReason: result.fallbackReason
      }
    },
    confidence: result.usedFallback ? 0.35 : 0.7,
    createdAt: new Date().toISOString()
  });
}

function parseModelSummary(raw: string): z.infer<typeof SummaryResponseSchema> | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    const validated = SummaryResponseSchema.parse(parsed);
    return {
      summary: clamp(validated.summary, 420),
      blockers: validated.blockers.map((blocker) => clamp(blocker, 140)).slice(0, 3),
      suggestedNextStep: clamp(validated.suggestedNextStep, 220),
      sourceSignals: validated.sourceSignals.map((signal) => clamp(signal, 160)).slice(0, 4),
      reason: clamp(validated.reason, 220)
    };
  } catch {
    return null;
  }
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

    const conversationalTurns = messageRows[index]
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(0, 3)
      .reverse()
      .map((message) => ({
        role: message.role,
        content: clamp(message.content, 220),
        createdAt: message.createdAt
      }));

    const latestUserTurn = [...conversationalTurns].reverse().find((message) => message.role === "user");
    const latestContinuation = latestUserTurn?.content ?? null;

    return {
      id: item.id,
      title: clamp(item.title, 140),
      snippet: clamp(item.rawContent, 220),
      updatedAt: item.updatedAt,
      topicGuess: item.topicGuess ?? null,
      latestSummary: latestSummary ? clamp(latestSummary, 220) : null,
      latestContinuation: latestContinuation ? clamp(latestContinuation, 220) : null,
      recentTurns: conversationalTurns
    };
  });

  const blockerSignals = [
    deterministic.summary,
    deterministic.reason,
    ...(deterministic.repeatedIdeas ?? []),
    ...tasks
      .filter((task) => task.status !== "done")
      .map((task) => `${task.title} is ${task.status}`),
    ...sessions
      .filter((session) => session.state === "paused")
      .map((session) => `Paused session for ${taskTitleById.get(session.taskId) ?? "linked task"}`)
  ]
    .filter(isLikelyBlockerSignal)
    .slice(0, 4)
    .map((signal) => clamp(signal, 160));

  return {
    itemIds: uniqueItemIds,
    items: promptItems,
    linkedTasks: tasks
      .slice(0, 6)
      .map((task) => ({
        title: clamp(task.title, 140),
        status: task.status,
        updatedAt: task.updatedAt
      })),
    linkedSessions: sessions
      .slice(0, 6)
      .map((session) => ({
        taskTitle: clamp(taskTitleById.get(session.taskId) ?? "Linked task", 140),
        state: session.state,
        startedAt: session.startedAt
      })),
    blockerSignals,
    sourceSignals: [
      ...(deterministic.repeatedIdeas ?? []),
      deterministic.reason,
      ...promptItems.map((item) => item.latestContinuation ?? item.snippet)
    ]
      .filter((value): value is string => Boolean(value))
      .slice(0, 6)
      .map((signal) => clamp(signal, 160))
  };
}

async function buildGroundingBundle(repo: DbRepository, itemIds: string[], deterministic: SynthesisFallback): Promise<GroundingBundle> {
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
  const fingerprint = sha256Json({
    kind: CACHE_KIND,
    itemIds: uniqueItemIds,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      rawContent: item.rawContent,
      updatedAt: item.updatedAt,
      status: item.status
    })),
    tasks: tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, updatedAt: task.updatedAt })),
    sessions: sessions.map((session) => ({ id: session.id, taskId: session.taskId, state: session.state, startedAt: session.startedAt, endedAt: session.endedAt })),
    messages: messages.map((message) => ({ id: message.id, role: message.role, content: clamp(message.content, 220), createdAt: message.createdAt })),
    artifacts: artifacts
      .filter((artifact) => artifact.payload.kind !== CACHE_KIND)
      .map((artifact) => ({ id: artifact.id, type: artifact.type, createdAt: artifact.createdAt, confidence: artifact.confidence }))
  });
  return { grounding, fingerprint, anchorItemId: items[0]?.id ?? null };
}

function buildFallbackResponse(
  deterministic: SynthesisFallback,
  reason: SummarizeProgressResult["fallbackReason"]
): SummarizeProgressResult {
  return {
    ...deterministic,
    blockers: [deterministic.reason].filter(isLikelyBlockerSignal).map((value) => clamp(value, 140)),
    sourceSignals: [
      ...(deterministic.repeatedIdeas ?? []),
      deterministic.reason
    ]
      .slice(0, 4)
      .map((value) => clamp(value, 160)),
    usedFallback: true,
    fallbackReason: reason
  };
}

export async function buildSummarizeProgressWithLlm(
  repo: DbRepository,
  itemIds: string[],
  options: {
    log?: FastifyBaseLogger;
    correlationId?: string;
    timeoutMs?: number;
  } = {}
): Promise<SummarizeProgressResult> {
  const startedAt = Date.now();
  const deterministic = await synthesizeFromItems(repo, itemIds, "cluster_summary");

  try {
    const { grounding, fingerprint, anchorItemId } = await buildGroundingBundle(repo, itemIds, deterministic);
    const cached = await readCachedResult(repo, anchorItemId, fingerprint);
    if (cached) {
      options.log?.info(
        {
          event: "summarize_progress_cache_hit",
          correlationId: options.correlationId,
          itemCount: grounding.items.length
        },
        "summarize progress cache hit"
      );
      return cached;
    }
    const prompt = buildSummarizeProgressPrompt(grounding);
    options.log?.info(
      {
        event: "summarize_progress_llm_started",
        correlationId: options.correlationId,
        itemCount: grounding.items.length,
        timeoutMs: options.timeoutMs
      },
      "summarize progress llm started"
    );

    const llm = await invokeLlm({
      instruction: prompt.instruction,
      context: prompt.groundedContext,
      taskClass: "summarize_progress",
      timeoutMs: options.timeoutMs
    });
    const parsed = parseModelSummary(llm.text);
    if (!parsed) {
      options.log?.warn(
        {
          event: "summarize_progress_llm_fallback",
          correlationId: options.correlationId,
          fallbackReason: "parse_failed",
          fallbackStage: "parse",
          fallbackOrder: FALLBACK_REASON_ORDER.parse_failed,
          errorCode: "invalid_response",
          errorName: "ParseError",
          durationMs: Date.now() - startedAt
        },
        "summarize progress llm parse failed"
      );
      const fallback = buildFallbackResponse(deterministic, "parse_failed");
      await writeCachedResult(repo, anchorItemId, fingerprint, grounding.itemIds, fallback);
      return fallback;
    }
    const qualityIssue = summarizeProgressQualityIssue(parsed);
    if (qualityIssue) {
      const qualityFallbackReason = toQualityIssueFallbackReason(qualityIssue);
      options.log?.warn(
        {
          event: "summarize_progress_llm_fallback",
          correlationId: options.correlationId,
          fallbackReason: qualityFallbackReason,
          fallbackStage: "parse",
          fallbackOrder: FALLBACK_REASON_ORDER[qualityFallbackReason],
          errorCode: qualityIssue,
          errorName: "QualityGuardError",
          durationMs: Date.now() - startedAt
        },
        "summarize progress llm output quality guard fallback"
      );
      const fallback = buildFallbackResponse(deterministic, qualityFallbackReason);
      await writeCachedResult(repo, anchorItemId, fingerprint, grounding.itemIds, fallback);
      return fallback;
    }

    options.log?.info(
      {
        event: "summarize_progress_llm_completed",
        correlationId: options.correlationId,
        provider: llm.provider,
        model: llm.model,
        durationMs: Date.now() - startedAt,
        providerLatencyMs: llm.latencyMs
      },
      "summarize progress llm completed"
    );

    const result: SummarizeProgressResult = {
      summary: parsed.summary,
      repeatedIdeas: deterministic.repeatedIdeas,
      suggestedNextAction: parsed.suggestedNextStep,
      reason: parsed.reason,
      blockers: parsed.blockers,
      sourceSignals: parsed.sourceSignals,
      usedFallback: false,
      cacheHit: false
    };
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
        event: "summarize_progress_llm_fallback",
        correlationId: options.correlationId,
        fallbackReason,
        fallbackStage: classified.fallbackStage,
        fallbackOrder: FALLBACK_REASON_ORDER[fallbackReason],
        errorCode: classified.providerErrorCode ?? "unknown",
        errorName: classified.errorName,
        durationMs: Date.now() - startedAt
      },
      "summarize progress llm fallback used"
    );
    const fallback = buildFallbackResponse(deterministic, fallbackReason);
    try {
      const { grounding, fingerprint, anchorItemId } = await buildGroundingBundle(repo, itemIds, deterministic);
      await writeCachedResult(repo, anchorItemId, fingerprint, grounding.itemIds, fallback);
    } catch {
      // Caching must never prevent deterministic fallback delivery.
    }
    return fallback;
  }
}
