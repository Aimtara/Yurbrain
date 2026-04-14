import { z } from "zod";

export const BrainItemTypeSchema = z.enum(["note", "link", "idea", "quote", "file"]);
export const BrainItemStatusSchema = z.enum(["active", "archived"]);
export const ArtifactTypeSchema = z.enum(["summary", "classification", "relation", "feed_card"]);
export const ThreadKindSchema = z.enum(["item_comment", "item_chat"]);
export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export const FeedCardTypeSchema = z.enum(["item", "digest", "cluster", "opportunity", "open_loop", "resume"]);
export const FeedLensSchema = z.enum(["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const SessionStateSchema = z.enum(["running", "paused", "finished"]);
export const EventTypeSchema = z.enum(["brain_item_created", "brain_item_updated"]);
export const FeedWhyShownSchema = z
  .object({
    summary: z.string().min(1).max(160),
    reasons: z.array(z.string().min(1).max(160)).min(1).max(3)
  })
  .strict();

export const BrainItemSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: BrainItemTypeSchema,
    title: z.string().min(1).max(200),
    rawContent: z.string().min(1),
    status: BrainItemStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export const ItemArtifactSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
    type: ArtifactTypeSchema,
    payload: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    createdAt: z.string().datetime()
  })
  .strict();

export const ItemThreadSchema = z
  .object({
    id: z.string().uuid(),
    targetItemId: z.string().uuid(),
    kind: ThreadKindSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export const ThreadMessageSchema = z
  .object({
    id: z.string().uuid(),
    threadId: z.string().uuid(),
    role: MessageRoleSchema,
    content: z.string().min(1),
    createdAt: z.string().datetime()
  })
  .strict();

export const FeedCardSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    cardType: FeedCardTypeSchema,
    lens: FeedLensSchema,
    itemId: z.string().uuid().nullable(),
    title: z.string().min(1),
    body: z.string().min(1),
    dismissed: z.boolean(),
    snoozedUntil: z.string().datetime().nullable(),
    refreshCount: z.number().int().min(0),
    lastRefreshedAt: z.string().datetime().nullable(),
    whyShown: FeedWhyShownSchema,
    createdAt: z.string().datetime()
  })
  .strict();

export const TaskSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    sourceItemId: z.string().uuid().nullable(),
    title: z.string().min(1),
    status: TaskStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();

export const SessionSchema = z
  .object({
    id: z.string().uuid(),
    taskId: z.string().uuid(),
    state: SessionStateSchema,
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().nullable()
  })
  .strict();

export const EventSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    eventType: EventTypeSchema,
    payload: z.record(z.string(), z.unknown()),
    occurredAt: z.string().datetime()
  })
  .strict();

export const UserPreferenceSchema = z
  .object({
    userId: z.string().uuid(),
    defaultLens: FeedLensSchema,
    cleanFocusMode: z.boolean(),
    updatedAt: z.string().datetime()
  })
  .strict();

export type BrainItem = z.infer<typeof BrainItemSchema>;
export type ItemArtifact = z.infer<typeof ItemArtifactSchema>;
export type ItemThread = z.infer<typeof ItemThreadSchema>;
export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;
export type FeedCard = z.infer<typeof FeedCardSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Event = z.infer<typeof EventSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
