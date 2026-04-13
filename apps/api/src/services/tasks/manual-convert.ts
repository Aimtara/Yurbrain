import { randomUUID } from "node:crypto";

import type { TaskRecord } from "../../state";

export type ManualConvertInput = {
  userId: string;
  sourceItemId: string;
  content: string;
};

function normalizeTitle(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return "Follow up on item";
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function createTaskFromManualContent(input: ManualConvertInput): TaskRecord {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    userId: input.userId,
    sourceItemId: input.sourceItemId,
    sourceMessageId: null,
    title: normalizeTitle(input.content),
    status: "todo",
    createdAt: now,
    updatedAt: now
  };
}
