import { z } from "zod";

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
  return BrainItemUpdatedEventPayloadSchema.parse(payload) as EventPayloadByType[T];
}
