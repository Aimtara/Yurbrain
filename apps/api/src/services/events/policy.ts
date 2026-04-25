import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { DbRepository } from "@yurbrain/db";

const BrainItemCreatedEventPayloadSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["note", "link", "idea", "quote", "file"]),
    contentType: z.enum(["text", "link", "image"]).optional(),
    topicGuess: z.string().min(1).max(120).nullable().optional()
  })
  .strict();

const BrainItemUpdatedChangeCategorySchema = z.enum(["content", "metadata", "status"]);

const BrainItemUpdatedEventPayloadSchema = z
  .object({
    id: z.string().uuid(),
    changedCategories: z.array(BrainItemUpdatedChangeCategorySchema).min(1).max(3)
  })
  .strict();

const updateCategoryByField: Record<string, z.infer<typeof BrainItemUpdatedChangeCategorySchema>> = {
  rawContent: "content",
  title: "metadata",
  status: "status"
};

function deriveUpdateCategories(changedFields: string[]): Array<z.infer<typeof BrainItemUpdatedChangeCategorySchema>> {
  const categories = new Set<z.infer<typeof BrainItemUpdatedChangeCategorySchema>>();
  for (const changedField of changedFields) {
    const category = updateCategoryByField[changedField];
    if (category) categories.add(category);
  }
  if (categories.size === 0) {
    categories.add("metadata");
  }
  return [...categories];
}

export type EventPayloadByType = {
  brain_item_created: z.infer<typeof BrainItemCreatedEventPayloadSchema>;
  brain_item_updated: z.infer<typeof BrainItemUpdatedEventPayloadSchema>;
  capture_created: Record<string, unknown>;
  brain_item_opened: Record<string, unknown>;
  feed_card_shown: Record<string, unknown>;
  feed_card_opened: Record<string, unknown>;
  feed_card_acted_on: Record<string, unknown>;
  feed_card_dismissed: Record<string, unknown>;
  feed_card_snoozed: Record<string, unknown>;
  comment_created: Record<string, unknown>;
  ai_summary_requested: Record<string, unknown>;
  ai_summary_saved: Record<string, unknown>;
  item_chat_started: Record<string, unknown>;
  item_chat_message_sent: Record<string, unknown>;
  plan_requested: Record<string, unknown>;
  task_created: Record<string, unknown>;
  session_started: Record<string, unknown>;
  session_paused: Record<string, unknown>;
  session_finished: Record<string, unknown>;
  connection_preview_requested: Record<string, unknown>;
  connection_saved: Record<string, unknown>;
  connection_dismissed: Record<string, unknown>;
};

export function buildBrainItemCreatedEventPayload(
  payload: EventPayloadByType["brain_item_created"]
): EventPayloadByType["brain_item_created"] {
  return BrainItemCreatedEventPayloadSchema.parse(payload);
}

export function buildBrainItemUpdatedEventPayload(input: {
  id: string;
  changed: string[];
}): EventPayloadByType["brain_item_updated"] {
  return BrainItemUpdatedEventPayloadSchema.parse({
    id: input.id,
    changedCategories: deriveUpdateCategories(input.changed)
  });
}

export function normalizeEventPayload<T extends keyof EventPayloadByType>(
  eventType: T,
  payload: EventPayloadByType[T]
): EventPayloadByType[T] {
  if (eventType === "brain_item_created") {
    return BrainItemCreatedEventPayloadSchema.parse(payload) as EventPayloadByType[T];
  }
  if (eventType === "brain_item_updated") {
    return BrainItemUpdatedEventPayloadSchema.parse(payload) as EventPayloadByType[T];
  }
  return z.record(z.string(), z.unknown()).parse(payload) as EventPayloadByType[T];
}

export async function recordEvent(
  repo: DbRepository,
  input: {
    userId: string;
    eventType: keyof EventPayloadByType;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const payload = normalizeEventPayload(input.eventType, {
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {}
  });
  return repo.appendEvent({
    id: randomUUID(),
    userId: input.userId,
    eventType: input.eventType,
    payload,
    occurredAt: new Date().toISOString()
  });
}
