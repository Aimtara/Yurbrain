import { z } from "zod";
import {
  BrainItemSchema,
  BrainItemTypeSchema,
  FeedCardSchema,
  ItemArtifactSchema,
  ItemThreadSchema,
  SessionSchema,
  SessionStateSchema,
  TaskSchema,
  TaskStatusSchema,
  ThreadMessageSchema
} from "../domain/domain";

export const CreateBrainItemRequestSchema = z
  .object({
    userId: z.string().uuid(),
    type: BrainItemTypeSchema,
    title: z.string().min(1).max(200),
    rawContent: z.string().min(1)
  })
  .strict();

export const UpdateBrainItemRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    rawContent: z.string().min(1).optional(),
    status: z.enum(["active", "archived"]).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const CreateThreadRequestSchema = ItemThreadSchema.pick({ targetItemId: true, kind: true });
export const CreateMessageRequestSchema = ThreadMessageSchema.pick({ threadId: true, role: true, content: true });
export const GenerateFeedCardRequestSchema = FeedCardSchema.pick({ userId: true, title: true, body: true }).partial({ title: true, body: true });
export const ManualConvertTaskRequestSchema = z
  .object({
    userId: z.string().uuid(),
    sourceItemId: z.string().uuid(),
    content: z.string().min(1)
  })
  .strict();

export const CreateTaskRequestSchema = z
  .object({
    userId: z.string().uuid(),
    title: z.string().min(1).max(200),
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional()
  })
  .strict();

export const UpdateTaskRequestSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    status: TaskStatusSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export const ListTasksQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    status: TaskStatusSchema.optional()
  })
  .strict();

export const TaskResponseSchema = TaskSchema.extend({
  sourceMessageId: z.string().uuid().nullable().optional()
});

export const TaskListResponseSchema = z.array(TaskResponseSchema);

export const AiConvertRequestSchema = z
  .object({
    userId: z.string().uuid(),
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional(),
    content: z.string().min(1)
  })
  .strict();

const ConvertCreateTaskSchema = z
  .object({
    outcome: z.literal("create_task"),
    task: TaskResponseSchema,
    confidence: z.number().min(0).max(1)
  })
  .strict();

const ConvertMiniPlanSchema = z
  .object({
    outcome: z.literal("mini_plan"),
    title: z.string().min(1),
    steps: z.array(z.string().min(1)).min(2).max(5),
    confidence: z.number().min(0).max(1)
  })
  .strict();

const ConvertNotRecommendedSchema = z
  .object({
    outcome: z.literal("not_recommended"),
    reason: z.string().min(1),
    confidence: z.number().min(0).max(1)
  })
  .strict();

export const AiConvertResponseSchema = z.discriminatedUnion("outcome", [
  ConvertCreateTaskSchema,
  ConvertMiniPlanSchema,
  ConvertNotRecommendedSchema
]);

export const StartTaskSessionRequestSchema = z.object({}).strict();
export const SessionResponseSchema = SessionSchema;

export const AiEnvelopeSchema = z
  .object({
    content: z.string().min(1),
    confidence: z.number().min(0).max(1),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export const SummarizeItemRequestSchema = z
  .object({
    itemId: z.string().uuid(),
    rawContent: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(10_000).optional()
  })
  .strict();

export const ClassifyItemRequestSchema = z
  .object({
    itemId: z.string().uuid(),
    rawContent: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(10_000).optional()
  })
  .strict();

export const QueryItemRequestSchema = z
  .object({
    threadId: z.string().uuid(),
    question: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(10_000).optional()
  })
  .strict();

export const AiArtifactResponseSchema = ItemArtifactSchema.extend({
  ai: AiEnvelopeSchema,
  fallbackUsed: z.boolean(),
  fallbackReason: z.enum(["timeout", "invalid_or_runner_error"]).optional()
}).strict();

export const QueryItemResponseSchema = z
  .object({
    threadId: z.string().uuid(),
    userMessage: ThreadMessageSchema,
    message: ThreadMessageSchema,
    ai: AiEnvelopeSchema,
    fallbackUsed: z.boolean(),
    fallbackReason: z.enum(["timeout", "invalid_or_runner_error"]).optional()
  })
  .strict();

export const BrainItemResponseSchema = BrainItemSchema;
export const BrainItemListResponseSchema = z.array(BrainItemSchema);
export const FeedCardResponseSchema = FeedCardSchema;
export const FeedListResponseSchema = z.array(FeedCardResponseSchema);
export const ManualConvertTaskResponseSchema = TaskSchema;
export const SessionListResponseSchema = z.array(SessionSchema.extend({ state: SessionStateSchema }));

export type CreateBrainItemRequest = z.infer<typeof CreateBrainItemRequestSchema>;
export type UpdateBrainItemRequest = z.infer<typeof UpdateBrainItemRequestSchema>;
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>;
export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>;
export type GenerateFeedCardRequest = z.infer<typeof GenerateFeedCardRequestSchema>;
export type ManualConvertTaskRequest = z.infer<typeof ManualConvertTaskRequestSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
export type AiConvertRequest = z.infer<typeof AiConvertRequestSchema>;
export type AiConvertResponse = z.infer<typeof AiConvertResponseSchema>;
export type SummarizeItemRequest = z.infer<typeof SummarizeItemRequestSchema>;
export type ClassifyItemRequest = z.infer<typeof ClassifyItemRequestSchema>;
export type QueryItemRequest = z.infer<typeof QueryItemRequestSchema>;
export type BrainItemResponse = z.infer<typeof BrainItemResponseSchema>;
export type BrainItemListResponse = z.infer<typeof BrainItemListResponseSchema>;
export type FeedCardResponse = z.infer<typeof FeedCardResponseSchema>;
export type FeedListResponse = z.infer<typeof FeedListResponseSchema>;
export type ManualConvertTaskResponse = z.infer<typeof ManualConvertTaskResponseSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type AiArtifactResponse = z.infer<typeof AiArtifactResponseSchema>;
export type QueryItemResponse = z.infer<typeof QueryItemResponseSchema>;
