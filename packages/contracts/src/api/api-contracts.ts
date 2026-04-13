import { z } from "zod";
import { BrainItemSchema, BrainItemTypeSchema } from "../domain/domain";

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

export const BrainItemResponseSchema = BrainItemSchema;
export const BrainItemListResponseSchema = z.array(BrainItemSchema);

export type CreateBrainItemRequest = z.infer<typeof CreateBrainItemRequestSchema>;
export type UpdateBrainItemRequest = z.infer<typeof UpdateBrainItemRequestSchema>;
export type BrainItemResponse = z.infer<typeof BrainItemResponseSchema>;
export type BrainItemListResponse = z.infer<typeof BrainItemListResponseSchema>;
