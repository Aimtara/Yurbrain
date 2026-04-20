import { randomUUID } from "node:crypto";
import {
  buildClassificationFallback,
  buildQueryFallback,
  buildSummaryFallback,
  runAiTask,
  validateAiEnvelope
} from "@yurbrain/ai";

type AiTask = "summarize" | "classify" | "query";

export async function resolveAiEnvelope(input: {
  task: AiTask;
  content: string;
  timeoutMs?: number;
  correlationId?: string;
  log?: { info: (payload: Record<string, unknown>, msg?: string) => void; warn: (payload: Record<string, unknown>, msg?: string) => void };
}) {
  const startedAt = Date.now();
  input.log?.info(
    {
      event: "ai_task_started",
      task: input.task,
      correlationId: input.correlationId,
      timeoutMs: input.timeoutMs
    },
    "ai task started"
  );

  try {
    const raw = await runAiTask(input);
    const validated = validateAiEnvelope(raw);
    input.log?.info(
      {
        event: "ai_task_completed",
        task: input.task,
        correlationId: input.correlationId,
        fallbackUsed: false,
        durationMs: Date.now() - startedAt,
        confidence: validated.confidence
      },
      "ai task completed"
    );
    return { ai: validated, fallbackUsed: false };
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("timed out") ? "timeout" : "invalid_or_runner_error";
    input.log?.warn(
      {
        event: "ai_task_fallback",
        task: input.task,
        correlationId: input.correlationId,
        fallbackReason: reason,
        durationMs: Date.now() - startedAt
      },
      "ai task fallback used"
    );

    if (input.task === "summarize") {
      return { ai: buildSummaryFallback(input.content), fallbackUsed: true, fallbackReason: reason };
    }

    if (input.task === "classify") {
      return { ai: buildClassificationFallback(input.content), fallbackUsed: true, fallbackReason: reason };
    }

    return { ai: buildQueryFallback(input.content), fallbackUsed: true, fallbackReason: reason };
  }
}

export function createArtifact(input: { itemId: string; type: "summary" | "classification"; content: string; confidence: number; metadata: Record<string, unknown> }) {
  return {
    id: randomUUID(),
    itemId: input.itemId,
    type: input.type,
    payload: { content: input.content, metadata: input.metadata },
    confidence: input.confidence,
    createdAt: new Date().toISOString()
  };
}
