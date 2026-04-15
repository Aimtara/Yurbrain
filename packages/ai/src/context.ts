const CONTEXT_PREFIX = "YURBRAIN_CONTEXT::";

export type GroundedAiContext = {
  primaryText: string;
  context: Record<string, unknown>;
};

export function encodeGroundedAiContext(input: GroundedAiContext): string {
  return `${CONTEXT_PREFIX}${JSON.stringify(input)}`;
}

export function decodeGroundedAiContext(content: string): GroundedAiContext | null {
  if (!content.startsWith(CONTEXT_PREFIX)) return null;
  const raw = content.slice(CONTEXT_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as Partial<GroundedAiContext>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.primaryText !== "string") return null;
    if (!parsed.context || typeof parsed.context !== "object" || Array.isArray(parsed.context)) return null;
    return {
      primaryText: parsed.primaryText,
      context: parsed.context as Record<string, unknown>
    };
  } catch {
    return null;
  }
}
