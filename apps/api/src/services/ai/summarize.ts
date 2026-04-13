import type { AppState } from "../../state";
import { createArtifact, resolveAiEnvelope } from "./shared";

export async function summarizeItem(state: AppState, input: { itemId: string; rawContent: string; timeoutMs?: number }) {
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "summarize",
    content: input.rawContent,
    timeoutMs: input.timeoutMs
  });

  const artifact = createArtifact({
    itemId: input.itemId,
    type: "summary",
    content: ai.content,
    confidence: ai.confidence,
    metadata: ai.metadata
  });

  state.artifacts.set(artifact.id, artifact);
  return { ...artifact, ai, fallbackUsed, fallbackReason };
}
