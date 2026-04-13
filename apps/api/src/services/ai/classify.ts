import type { AppState } from "../../state";
import { createArtifact, resolveAiEnvelope } from "./shared";

export async function classifyItem(state: AppState, input: { itemId: string; rawContent: string; timeoutMs?: number }) {
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "classify",
    content: input.rawContent,
    timeoutMs: input.timeoutMs
  });

  const artifact = createArtifact({
    itemId: input.itemId,
    type: "classification",
    content: ai.content,
    confidence: ai.confidence,
    metadata: ai.metadata
  });

  state.artifacts.set(artifact.id, artifact);
  return { ...artifact, ai, fallbackUsed, fallbackReason };
}
