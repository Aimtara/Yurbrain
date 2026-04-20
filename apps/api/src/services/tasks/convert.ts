import { randomUUID } from "node:crypto";

import type { AiConvertRequest } from "@yurbrain/contracts";
import type { TaskRecord } from "../../state";

export type ConvertDecision =
  | {
      outcome: "task_created";
      task: TaskRecord;
      sourceItemId: string | null;
      sourceMessageId: string | null;
      confidence: number;
    }
  | {
      outcome: "plan_suggested";
      title: string;
      steps: string[];
      sourceItemId: string | null;
      sourceMessageId: string | null;
      confidence: number;
    }
  | {
      outcome: "not_recommended";
      reason: string;
      sourceItemId: string | null;
      sourceMessageId: string | null;
      confidence: number;
    };

function toTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Follow up";
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function convertToTaskDecision(input: AiConvertRequest & { userId: string }): ConvertDecision {
  const normalized = input.content.trim();
  const sourceItemId = input.sourceItemId ?? null;
  const sourceMessageId = input.sourceMessageId ?? null;

  if (normalized.length < 12) {
    return {
      outcome: "not_recommended",
      reason: "Content is too short to create an actionable task.",
      sourceItemId,
      sourceMessageId,
      confidence: 0.82
    };
  }

  if (normalized.includes("?") || /\b(plan|strategy|outline)\b/i.test(normalized)) {
    const title = toTitle(normalized);
    return {
      outcome: "plan_suggested",
      title,
      steps: ["Clarify desired outcome", "Define first concrete action", "Set a checkpoint to review progress"],
      sourceItemId,
      sourceMessageId,
      confidence: 0.7
    };
  }

  const now = new Date().toISOString();
  return {
    outcome: "task_created",
    sourceItemId,
    sourceMessageId,
    confidence: 0.86,
    task: {
      id: randomUUID(),
      userId: input.userId,
      sourceItemId,
      sourceMessageId,
      title: toTitle(normalized),
      status: "todo",
      createdAt: now,
      updatedAt: now
    }
  };
}
