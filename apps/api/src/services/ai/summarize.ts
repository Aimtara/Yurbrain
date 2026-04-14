import type { FastifyBaseLogger } from "fastify";
import type { AppState } from "../../state";
import { createArtifact, resolveAiEnvelope } from "./shared";

export async function summarizeItem(
  state: AppState,
  input: { itemId: string; rawContent: string; timeoutMs?: number },
  log?: FastifyBaseLogger,
  correlationId?: string
) {
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "summarize",
    content: input.rawContent,
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
