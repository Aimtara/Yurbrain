import { z } from "zod";
import { FeedLensSchema } from "../domain/domain";

export const FounderReviewWindowSchema = z.enum(["7d"]);
export const FounderReviewExecutionLensSchema = z.enum(["all", "ready_to_move", "needs_unblock", "momentum"]);
export const FounderReviewScoreStatusSchema = z.enum(["strong", "watch", "weak"]);
export const FounderReviewRiskSeveritySchema = z.enum(["low", "medium", "high"]);

export const FounderReviewActionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(120),
    target: z.enum(["feed", "item"]),
    lens: FeedLensSchema.optional(),
    executionLens: FounderReviewExecutionLensSchema.optional(),
    itemId: z.string().uuid().optional(),
    itemIds: z.array(z.string().uuid()).max(24).optional()
  })
  .strict();

export const FounderReviewScoreSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1).max(80),
    score: z.number().min(0).max(100),
    status: FounderReviewScoreStatusSchema,
    action: FounderReviewActionSchema
  })
  .strict();

export const FounderReviewRiskFlagSchema = z
  .object({
    id: z.string().min(1),
    severity: FounderReviewRiskSeveritySchema,
    title: z.string().min(1).max(120),
    detail: z.string().min(1).max(260),
    action: FounderReviewActionSchema
  })
  .strict();

export const FounderReviewCurrentReadoutSchema = z
  .object({
    strongestArea: FounderReviewScoreSchema,
    weakestArea: FounderReviewScoreSchema,
    mainRisk: FounderReviewRiskFlagSchema,
    recommendedNextMove: z
      .object({
        title: z.string().min(1).max(120),
        detail: z.string().min(1).max(260),
        action: FounderReviewActionSchema
      })
      .strict()
  })
  .strict();

export const FounderReviewExecutionSummarySchema = z
  .object({
    activeWork: z.number().int().min(0),
    blocked: z.number().int().min(0),
    stale: z.number().int().min(0),
    suggestedNextFocus: z
      .object({
        title: z.string().min(1).max(160),
        reason: z.string().min(1).max(220),
        action: FounderReviewActionSchema
      })
      .strict()
      .nullable()
  })
  .strict();

export const FounderReviewCrossPlatformSchema = z
  .object({
    mobileToWeb: FounderReviewScoreSchema,
    webToMobile: FounderReviewScoreSchema,
    feedConsistency: FounderReviewScoreSchema,
    stateContinuity: FounderReviewScoreSchema,
    signalNote: z.string().min(1).max(220)
  })
  .strict();

export const FounderReviewResponseSchema = z
  .object({
    generatedAt: z.string().datetime(),
    window: FounderReviewWindowSchema,
    header: z
      .object({
        title: z.string().min(1).max(80),
        subtitle: z.string().min(1).max(180)
      })
      .strict(),
    overview: z
      .object({
        overallProduct: FounderReviewScoreSchema,
        web: FounderReviewScoreSchema,
        mobile: FounderReviewScoreSchema,
        crossPlatform: FounderReviewScoreSchema
      })
      .strict(),
    loopHealth: z.array(FounderReviewScoreSchema).length(6),
    currentReadout: FounderReviewCurrentReadoutSchema,
    founderExecutionSummary: FounderReviewExecutionSummarySchema,
    crossPlatformContinuity: FounderReviewCrossPlatformSchema,
    riskFlags: z.array(FounderReviewRiskFlagSchema).max(8)
  })
  .strict();

export const FounderReviewQuerySchema = z
  .object({
    window: FounderReviewWindowSchema.optional().default("7d"),
    userId: z.string().uuid().optional()
  })
  .strict();

export type FounderReviewAction = z.infer<typeof FounderReviewActionSchema>;
export type FounderReviewScore = z.infer<typeof FounderReviewScoreSchema>;
export type FounderReviewRiskFlag = z.infer<typeof FounderReviewRiskFlagSchema>;
export type FounderReviewResponse = z.infer<typeof FounderReviewResponseSchema>;
export type FounderReviewQuery = z.infer<typeof FounderReviewQuerySchema>;
