import { randomUUID } from "node:crypto";

export type ManualConvertInput = {
  userId: string;
  sourceItemId: string;
  content: string;
};

export type ManualConvertTask = {
  id: string;
  userId: string;
  sourceItemId: string;
  title: string;
  status: "todo";
  createdAt: string;
  updatedAt: string;
};

function normalizeTitle(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return "Follow up on item";
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function createTaskFromManualContent(input: ManualConvertInput): ManualConvertTask {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    userId: input.userId,
    sourceItemId: input.sourceItemId,
    title: normalizeTitle(input.content),
    status: "todo",
    createdAt: now,
    updatedAt: now
  };
}
