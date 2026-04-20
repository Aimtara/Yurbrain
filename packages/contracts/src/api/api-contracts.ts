import { z } from "zod";
import {
  AiSummaryModeSchema,
  ArtifactTypeSchema,
  BrainItemSchema,
  BrainItemTypeSchema,
  CaptureContentTypeSchema,
  FeedDensitySchema,
  FeedCardSchema,
  FeedLensSchema,
  ItemArtifactSchema,
  ItemThreadSchema,
  RenderModeSchema,
  ResurfacingIntensitySchema,
  SessionSchema,
  SessionStateSchema,
  TaskSchema,
  TaskStatusSchema,
  ThreadMessageSchema,
  UserPreferenceSchema
} from "../domain/domain";

export const CreateBrainItemRequestSchema = z
  .object({
    userId: z.string().uuid().optional(),
    type: BrainItemTypeSchema,
    title: z.string().min(1).max(200),
    rawContent: z.string().min(1)
  })
  .strict();

const CaptureUrlSchema = z.string().trim().min(1).max(500);
const CaptureSourceObjectSchema = z
  .object({
    app: z.string().min(1).max(80).optional(),
    link: CaptureUrlSchema.optional()
  })
  .strict();
const CaptureSourceSchema = z.union([z.string().min(1).max(500), CaptureSourceObjectSchema]);

export const CaptureIntakeRequestSchema = z
  .object({
    userId: z.string().uuid().optional(),
    type: CaptureContentTypeSchema.optional(),
    content: z.string().min(1).max(10_000).optional(),
    text: z.string().min(1).max(10_000).optional(),
    link: CaptureUrlSchema.optional(),
    image: CaptureUrlSchema.optional(),
    source: CaptureSourceSchema.optional(),
    note: z.string().min(1).max(500).optional(),
    preview: z
      .object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().min(1).max(500).optional(),
        imageUrl: CaptureUrlSchema.optional()
      })
      .strict()
      .optional(),
    topicGuess: z.string().min(1).max(120).optional(),
    founderMode: z.boolean().optional(),
    execution: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .refine((value) => Boolean(value.content || value.text || value.link || value.image), {
    message: "At least one of content, text, link, or image is required"
  });

export const CaptureRelatedItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    topicGuess: z.string().nullable(),
    score: z.number().min(0),
    reason: z.string().min(1)
  })
  .strict();

export const CaptureIntakeResponseSchema = z
  .object({
    itemId: z.string().uuid(),
    preview: z
      .object({
        title: z.string().min(1),
        snippet: z.string().min(1),
        contentType: CaptureContentTypeSchema,
        topicGuess: z.string().nullable(),
        source: z.string().nullable(),
        note: z.string().nullable()
      })
      .strict(),
    item: BrainItemSchema,
    relatedItems: z.array(CaptureRelatedItemSchema),
    clusterCard: FeedCardSchema.nullable(),
    enrichment: z
      .object({
        fallbackUsed: z.boolean(),
        warnings: z.array(z.string())
      })
      .strict()
  })
  .strict();

export const RelatedItemsResponseSchema = z
  .object({
    itemId: z.string().uuid(),
    relatedItemIds: z.array(z.string().uuid())
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
    userId: z.string().uuid().optional(),
    sourceItemId: z.string().uuid(),
    content: z.string().min(1)
  })
  .strict();

export const CreateTaskRequestSchema = z
  .object({
    userId: z.string().uuid().optional(),
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
    userId: z.string().uuid().optional(),
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional(),
    content: z.string().min(1)
  })
  .strict();

export const AuthMeResponseSchema = z
  .object({
    id: z.string().uuid(),
    source: z.enum(["header", "authorization", "legacy_query", "legacy_params", "legacy_body", "test_fallback"])
  })
  .strict();

const ConvertCreateTaskSchema = z
  .object({
    outcome: z.literal("task_created"),
    task: TaskResponseSchema,
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional(),
    confidence: z.number().min(0).max(1)
  })
  .strict();

const ConvertMiniPlanSchema = z
  .object({
    outcome: z.literal("plan_suggested"),
    title: z.string().min(1),
    steps: z.array(z.string().min(1)).min(2).max(5),
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional(),
    confidence: z.number().min(0).max(1)
  })
  .strict();

const ConvertNotRecommendedSchema = z
  .object({
    outcome: z.literal("not_recommended"),
    reason: z.string().min(1),
    sourceItemId: z.string().uuid().nullable().optional(),
    sourceMessageId: z.string().uuid().nullable().optional(),
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

export const AiSynthesisRequestSchema = z
  .object({
    itemIds: z.array(z.string().uuid()).min(1).max(24)
  })
  .strict();

export const AiSynthesisResponseSchema = z
  .object({
    summary: z.string().min(1).max(1_200),
    repeatedIdeas: z.array(z.string().min(1).max(180)).max(5).optional(),
    suggestedNextAction: z.string().min(1).max(240),
    reason: z.string().min(1).max(240)
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
export const ListItemArtifactsQuerySchema = z
  .object({
    type: ArtifactTypeSchema.optional()
  })
  .strict();
export const ItemArtifactListResponseSchema = z.array(ItemArtifactSchema);
export const FeedCardResponseSchema = FeedCardSchema;
export const FeedListResponseSchema = z.array(FeedCardResponseSchema);
export const ManualConvertTaskResponseSchema = TaskSchema;
export const ListSessionsQuerySchema = z
  .object({
    taskId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    state: SessionStateSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one filter must be provided" });
export const SessionListResponseSchema = z.array(SessionSchema);
export const UserPreferenceResponseSchema = UserPreferenceSchema;
export const UserPreferenceMeResponseSchema = UserPreferenceSchema;
export const UpdateUserPreferenceRequestSchema = z
  .object({
    defaultLens: FeedLensSchema.optional(),
    cleanFocusMode: z.boolean().optional(),
    founderMode: z.boolean().optional(),
    renderMode: RenderModeSchema.optional(),
    aiSummaryMode: AiSummaryModeSchema.optional(),
    feedDensity: FeedDensitySchema.optional(),
    resurfacingIntensity: ResurfacingIntensitySchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided" });

export type CreateBrainItemRequest = z.infer<typeof CreateBrainItemRequestSchema>;
export type CaptureIntakeRequest = z.infer<typeof CaptureIntakeRequestSchema>;
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
export type AiSynthesisRequest = z.infer<typeof AiSynthesisRequestSchema>;
export type AiSynthesisResponse = z.infer<typeof AiSynthesisResponseSchema>;
export type RelatedItemsResponse = z.infer<typeof RelatedItemsResponseSchema>;
export type ListItemArtifactsQuery = z.infer<typeof ListItemArtifactsQuerySchema>;
export type BrainItemResponse = z.infer<typeof BrainItemResponseSchema>;
export type BrainItemListResponse = z.infer<typeof BrainItemListResponseSchema>;
export type ItemArtifactListResponse = z.infer<typeof ItemArtifactListResponseSchema>;
export type FeedCardResponse = z.infer<typeof FeedCardResponseSchema>;
export type FeedListResponse = z.infer<typeof FeedListResponseSchema>;
export type ManualConvertTaskResponse = z.infer<typeof ManualConvertTaskResponseSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
export type AiArtifactResponse = z.infer<typeof AiArtifactResponseSchema>;
export type QueryItemResponse = z.infer<typeof QueryItemResponseSchema>;
export type UserPreferenceResponse = z.infer<typeof UserPreferenceResponseSchema>;
export type UpdateUserPreferenceRequest = z.infer<typeof UpdateUserPreferenceRequestSchema>;
export type CaptureIntakeResponse = z.infer<typeof CaptureIntakeResponseSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
