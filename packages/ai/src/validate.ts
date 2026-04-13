import { z } from "zod";

export const AiEnvelopeSchema = z
  .object({
    content: z.string().min(1),
    confidence: z.number().min(0).max(1),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export type AiEnvelope = z.infer<typeof AiEnvelopeSchema>;

export function validateAiEnvelope(payload: unknown): AiEnvelope {
  return AiEnvelopeSchema.parse(payload);
}
