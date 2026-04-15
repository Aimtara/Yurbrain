import type { FastifyBaseLogger } from "fastify";
import { encodeGroundedAiContext } from "../../../../../packages/ai/src";
import type { AppState } from "../../state";
import { buildItemExecutionContext } from "./execution-context";
import { createArtifact, resolveAiEnvelope } from "./shared";

export async function summarizeItem(
  state: AppState,
  input: { itemId: string; rawContent: string; timeoutMs?: number },
  log?: FastifyBaseLogger,
  correlationId?: string
) {
  const executionContext = await buildItemExecutionContext(state, input.itemId);
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "summarize",
    content: encodeGroundedAiContext({
      primaryText: input.rawContent,
      context: {
        itemTitle: executionContext.itemTitle,
        changed: executionContext.changed,
        done: executionContext.done,
        blocked: executionContext.blocked,
        nextMove: executionContext.nextMove
      }
    }),
    timeoutMs: input.timeoutMs,
    log,
    correlationId
  });

  const artifact = createArtifact({
    itemId: input.itemId,
    type: "summary",
    content: ai.content,
    confidence: ai.confidence,
    metadata: ai.metadata
  });

  await state.repo.createArtifact(artifact);
  log?.info({ event: "summary_artifact_persisted", artifactId: artifact.id, itemId: input.itemId, correlationId }, "summary persisted");
  return { ...artifact, ai, fallbackUsed, fallbackReason };
}
