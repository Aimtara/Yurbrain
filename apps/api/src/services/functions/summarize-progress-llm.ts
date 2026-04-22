import type { FastifyBaseLogger } from "fastify";
import type { DbRepository } from "@yurbrain/db";
import { z } from "zod";
import { invokeLlm } from "../ai/provider";
import { synthesizeFromItems } from "../ai/synthesis";
import { buildSummarizeProgressPrompt } from "./summarize-progress-prompt";
import {
  classifyLlmFallback,
  FALLBACK_REASON_ORDER,
  type LlmFallbackReason
} from "./llm-fallback";

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

export type SummarizeProgressResult = SynthesisFallback & {
  blockers?: string[];
  sourceSignals?: string[];
  usedFallback?: boolean;
  fallbackReason?: LlmFallbackReason;
};

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

    const latestContinuation =
      messageRows[index].find((message) => message.role === "user")?.content ?? null;

    return {
      id: item.id,
      title: clamp(item.title, 140),
      snippet: clamp(item.rawContent, 220),
      updatedAt: item.updatedAt,
      topicGuess: item.topicGuess ?? null,
      latestSummary: latestSummary ? clamp(latestSummary, 220) : null,
      latestContinuation: latestContinuation ? clamp(latestContinuation, 220) : null
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
    const grounding = await buildPromptGrounding(repo, itemIds, deterministic);
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
          durationMs: Date.now() - startedAt
        },
        "summarize progress llm parse failed"
      );
      return buildFallbackResponse(deterministic, "parse_failed");
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

    return {
      summary: parsed.summary,
      repeatedIdeas: deterministic.repeatedIdeas,
      suggestedNextAction: parsed.suggestedNextStep,
      reason: parsed.reason,
      blockers: parsed.blockers,
      sourceSignals: parsed.sourceSignals,
      usedFallback: false
    };
  } catch (error) {
    const classified = classifyLlmFallback(error);
    const fallbackReason = classified.fallbackReason;

    options.log?.warn(
      {
        event: "summarize_progress_llm_fallback",
        correlationId: options.correlationId,
        fallbackReason,
        fallbackStage: "invoke_or_grounding",
        fallbackOrder: FALLBACK_REASON_ORDER[fallbackReason],
        errorCode: classified.providerErrorCode ?? "unknown",
        errorName: classified.errorName,
        durationMs: Date.now() - startedAt
      },
      "summarize progress llm fallback used"
    );
    return buildFallbackResponse(deterministic, fallbackReason);
  }
}
