import type { FastifyBaseLogger } from "fastify";
import type { AppState } from "../../state";
import { createArtifact, resolveAiEnvelope } from "./shared";

export async function classifyItem(
  state: AppState,
  input: { itemId: string; rawContent: string; timeoutMs?: number },
  log?: FastifyBaseLogger,
  correlationId?: string
) {
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "classify",
    content: input.rawContent,
    timeoutMs: input.timeoutMs,
    log,
    correlationId
  });

  const artifact = createArtifact({
    itemId: input.itemId,
    type: "classification",
    content: ai.content,
    confidence: ai.confidence,
    metadata: ai.metadata
  });

  await state.repo.createArtifact(artifact);
  log?.info({ event: "classification_artifact_persisted", artifactId: artifact.id, itemId: input.itemId, correlationId }, "classification persisted");
  return { ...artifact, ai, fallbackUsed, fallbackReason };
}
