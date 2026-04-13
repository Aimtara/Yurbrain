import { randomUUID } from "node:crypto";

import type { AiConvertRequest } from "../../../../../packages/contracts/src";
import type { TaskRecord } from "../../state";

export type ConvertDecision =
  | { outcome: "create_task"; task: TaskRecord; confidence: number }
  | { outcome: "mini_plan"; title: string; steps: string[]; confidence: number }
  | { outcome: "not_recommended"; reason: string; confidence: number };

function toTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Follow up";
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function convertToTaskDecision(input: AiConvertRequest): ConvertDecision {
  const normalized = input.content.trim();

  if (normalized.length < 12) {
    return {
      outcome: "not_recommended",
      reason: "Content is too short to create an actionable task.",
      confidence: 0.82
    };
  }

  if (normalized.includes("?") || /\b(plan|strategy|outline)\b/i.test(normalized)) {
    const title = toTitle(normalized);
    return {
      outcome: "mini_plan",
      title,
      steps: ["Clarify desired outcome", "Define first concrete action", "Set a checkpoint to review progress"],
      confidence: 0.7
    };
  }

  const now = new Date().toISOString();
  return {
    outcome: "create_task",
    confidence: 0.86,
    task: {
      id: randomUUID(),
      userId: input.userId,
      sourceItemId: input.sourceItemId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      title: toTitle(normalized),
      status: "todo",
      createdAt: now,
      updatedAt: now
    }
  };
}
