import type { FastifyBaseLogger } from "fastify";
import type { DbRepository } from "@yurbrain/db";
import { z } from "zod";
import { invokeLlm, LlmProviderError } from "../ai/provider";
import { synthesizeFromItems } from "../ai/synthesis";
import { buildWhatShouldIDoNextPrompt } from "./what-should-i-do-next-prompt";
import {
  type LlmFallbackReason,
  FALLBACK_REASON_ORDER,
  normalizeFallbackReason,
  toFallbackReason
} from "./llm-fallback";

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

export type WhatShouldIDoNextResult = SynthesisFallback & {
  sourceSignals?: string[];
  usedFallback?: boolean;
  fallbackReason?: LlmFallbackReason;
  confidence?: number;
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
  let fallbackReason: LlmFallbackReason | null = null;

  try {
    const grounding = await buildPromptGrounding(repo, itemIds, deterministic);
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
      timeoutMs: options.timeoutMs
    });
    const parsed = parseModelNextStep(llm.text);
    if (!parsed) {
      fallbackReason = "parse_failed";
      options.log?.warn(
        {
          event: "what_should_i_do_next_llm_fallback",
          correlationId: options.correlationId,
          fallbackReason,
          fallbackStage: "parse",
          fallbackOrder: FALLBACK_REASON_ORDER[fallbackReason],
          durationMs: Date.now() - startedAt
        },
        "what should i do next llm parse failed"
      );
      return buildFallbackResponse(deterministic, fallbackReason);
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

    return {
      summary: parsed.summary,
      repeatedIdeas: deterministic.repeatedIdeas,
      suggestedNextAction: parsed.suggestedNextStep,
      reason: parsed.reason,
      sourceSignals: parsed.sourceSignals,
      usedFallback: false,
      confidence: parsed.confidence
    };
  } catch (error) {
    if (error instanceof LlmProviderError) {
      fallbackReason = toFallbackReason(error.code);
    }
    fallbackReason = normalizeFallbackReason(fallbackReason);

    options.log?.warn(
      {
        event: "what_should_i_do_next_llm_fallback",
        correlationId: options.correlationId,
        fallbackReason,
        fallbackStage: "invoke_or_grounding",
        fallbackOrder: FALLBACK_REASON_ORDER[fallbackReason],
        errorCode: error instanceof LlmProviderError ? error.code : "unknown",
        durationMs: Date.now() - startedAt
      },
      "what should i do next llm fallback used"
    );
    return buildFallbackResponse(deterministic, fallbackReason);
  }
}
