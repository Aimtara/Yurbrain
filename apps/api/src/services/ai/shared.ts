import { randomUUID } from "node:crypto";
import {
  buildClassificationFallback,
  buildQueryFallback,
  buildSummaryFallback,
  runAiTask,
  validateAiEnvelope
} from "../../../../../packages/ai/src";

export async function resolveAiEnvelope(input: {
  task: "summarize" | "classify" | "query";
  content: string;
  timeoutMs?: number;
}) {
  try {
    const raw = await runAiTask(input);
    return { ai: validateAiEnvelope(raw), fallbackUsed: false };
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("timed out") ? "timeout" : "invalid_or_runner_error";
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
