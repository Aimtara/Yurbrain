import type { BrainItemRecord } from "../../state";
import { encodeGroundedAiContext, runAiTask, validateAiEnvelope } from "@yurbrain/ai";

type RepoLike = {
  getBrainItemById: (id: string) => Promise<BrainItemRecord | null>;
  listArtifactsByItem?: (
    itemId: string,
    query?: { type?: "summary" | "classification" | "relation" | "feed_card" }
  ) => Promise<Array<{ payload: Record<string, unknown>; createdAt: string }>>;
  listThreads?: (targetItemId?: string) => Promise<Array<{ id: string; targetItemId: string }>>;
  listMessagesByThread?: (threadId: string) => Promise<Array<{ role: "user" | "assistant" | "system"; content: string; createdAt: string }>>;
};

type SynthesisMode = "cluster_summary" | "next_step";

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "from",
  "have",
  "into",
  "just",
  "only",
  "that",
  "there",
  "these",
  "they",
  "this",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

function compact(input: string, max = 180): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normalizeTopic(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toKeywords(items: BrainItemRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const source = [item.title, item.rawContent, item.topicGuess ?? "", item.previewTitle ?? "", item.previewDescription ?? ""].join(" ");
    for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length < 4 || STOPWORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token);
}

function toKeywordCounts(items: BrainItemRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const source = [item.title, item.rawContent, item.topicGuess ?? "", item.previewTitle ?? "", item.previewDescription ?? ""].join(" ");
    const seenInItem = new Set<string>();
    for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length < 4 || STOPWORDS.has(token)) continue;
      seenInItem.add(token);
    }
    for (const token of seenInItem) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return counts;
}

function inferTheme(items: BrainItemRecord[]): string {
  const topicCounts = new Map<string, number>();
  for (const item of items) {
    const topic = normalizeTopic(item.topicGuess);
    if (!topic) continue;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const rankedTopics = [...topicCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (rankedTopics[0]) return rankedTopics[0][0];
  const keywords = toKeywords(items);
  if (keywords.length === 0) return "Connected captures";
  return keywords.slice(0, 2).map((token) => token[0]?.toUpperCase() + token.slice(1)).join(" ");
}

function extractPayloadContent(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const content = payload.content;
  if (typeof content === "string" && content.trim().length > 0) return content.trim();
  const rationale = payload.rationale;
  if (typeof rationale === "string" && rationale.trim().length > 0) return rationale.trim();
  return null;
}

function sentenceFromContent(raw: string, max = 140): string {
  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  return compact(firstSentence, max);
}

function detectBlockerHint(items: BrainItemRecord[]): string | null {
  const blockerRegex = /\b(blocked|stuck|waiting|dependency|approval|review)\b/i;
  const candidate = items.find((item) => blockerRegex.test(item.rawContent)) ?? null;
  if (!candidate) return null;
  const match = candidate.rawContent.match(blockerRegex);
  if (!match?.[0]) return "There is a blocker signal in recent captures.";
  return `Latest blocker signal mentions "${match[0]}".`;
}

async function buildItemEvidence(repo: RepoLike, item: BrainItemRecord): Promise<string[]> {
  const evidence: string[] = [];
  evidence.push(sentenceFromContent(item.rawContent, 150));

  const artifacts = repo.listArtifactsByItem
    ? await repo.listArtifactsByItem(item.id, { type: "summary" })
    : [];
  const latestArtifact = [...artifacts].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const artifactText = extractPayloadContent(latestArtifact?.payload);
  if (artifactText) {
    evidence.push(`Recent summary: ${compact(artifactText, 150)}`);
  }

  if (repo.listThreads && repo.listMessagesByThread) {
    const threads = await repo.listThreads(item.id);
    const targetThreads = threads.filter((thread) => thread.targetItemId === item.id);
    const messages = (
      await Promise.all(targetThreads.map((thread) => repo.listMessagesByThread?.(thread.id) ?? Promise.resolve([])))
    )
      .flat()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const latestUser = messages.find((message) => message.role === "user");
    if (latestUser?.content) {
      evidence.push(`Recent update: ${compact(latestUser.content, 150)}`);
    }
  }

  return evidence;
}

type LlmSynthesisResult = {
  summary: string;
  suggestedNextAction: string;
  reason: string;
};

function normalizeLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return compact(normalized, max);
}

function parseLlmSynthesisContent(content: string): LlmSynthesisResult | null {
  const sections = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^-+\s*/, ""));
  const summaryLine = sections.find((line) => /^summary:/i.test(line));
  const actionLine = sections.find((line) => /^action:/i.test(line));
  const reasonLine = sections.find((line) => /^reason:/i.test(line));
  if (!summaryLine || !actionLine || !reasonLine) return null;
  const summary = normalizeLine(summaryLine.replace(/^summary:\s*/i, ""), 480);
  const suggestedNextAction = normalizeLine(actionLine.replace(/^action:\s*/i, ""), 240);
  const reason = normalizeLine(reasonLine.replace(/^reason:\s*/i, ""), 220);
  if (!summary || !suggestedNextAction || !reason) return null;
  return { summary, suggestedNextAction, reason };
}

function buildSynthesisAiInput(input: {
  mode: SynthesisMode;
  theme: string;
  itemCount: number;
  repeatedIdeas: string[];
  blockerHint: string | null;
  nextAction: { suggestedNextAction: string; reason: string };
  evidenceByItem: Map<string, string[]>;
  items: BrainItemRecord[];
}): string {
  const evidenceLines = input.items
    .slice(0, 4)
    .map((item) => {
      const evidence = input.evidenceByItem.get(item.id) ?? [];
      const first = evidence[0] ?? sentenceFromContent(item.rawContent, 140);
      return `${compact(item.title, 80)} => ${compact(first, 140)}`;
    });

  const primaryText =
    input.mode === "next_step"
      ? "Generate concise actionable next-step guidance."
      : "Generate concise synthesis summary for grouped captures.";

  return encodeGroundedAiContext({
    primaryText,
    context: {
      synthesisMode: input.mode,
      theme: input.theme,
      itemCount: input.itemCount,
      repeatedIdeas: input.repeatedIdeas,
      blockerHint: input.blockerHint ?? "none",
      recommendation: input.nextAction.suggestedNextAction,
      reason: input.nextAction.reason,
      evidence: evidenceLines.join(" | "),
      formatInstruction:
        "Return exactly three lines: Summary: <text>. Action: <text>. Reason: <text>. Keep each line concise and grounded."
    }
  });
}

async function runLlmSynthesis(input: {
  mode: SynthesisMode;
  theme: string;
  itemCount: number;
  repeatedIdeas: string[];
  blockerHint: string | null;
  nextAction: { suggestedNextAction: string; reason: string };
  evidenceByItem: Map<string, string[]>;
  items: BrainItemRecord[];
}): Promise<LlmSynthesisResult | null> {
  try {
    const task = input.mode === "next_step" ? "query" : "summarize";
    const aiInput = buildSynthesisAiInput(input);
    const raw = await runAiTask({ task, content: aiInput, timeoutMs: 1_400 });
    const envelope = validateAiEnvelope(raw);
    return parseLlmSynthesisContent(envelope.content);
  } catch {
    return null;
  }
}

function inferNextAction(
  items: BrainItemRecord[],
  theme: string,
  blockerHint: string | null
): { suggestedNextAction: string; reason: string } {
  const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const anchor = sorted[0];
  if (!anchor) {
    return {
      suggestedNextAction: "Re-open one capture and add a single continuation note.",
      reason: "A concrete continuation note restores context with minimal effort."
    };
  }
  const anchorTitle = compact(anchor.title, 96);
  const baseAction =
    anchor.contentType === "link"
      ? `Open "${anchorTitle}", skim for 10 minutes, and capture one decision note.`
      : anchor.contentType === "image"
        ? `Review "${anchorTitle}" and add one concrete takeaway in a new update.`
        : `Re-open "${anchorTitle}" and write one concrete next move in 10 minutes.`;
  const action = blockerHint ? `${baseAction} Start by clearing the blocker first.` : baseAction;
  const reason = blockerHint
    ? `It is the most recent signal in this thread, and clearing the blocker restores momentum.`
    : `It is the most recently touched capture in this thread and keeps the same theme grounded.`;
  return {
    suggestedNextAction: compact(action, 240),
    reason: compact(reason, 220)
  };
}

function buildSummary(
  items: BrainItemRecord[],
  repeatedIdeas: string[],
  theme: string,
  mode: SynthesisMode,
  evidenceByItem: Map<string, string[]>,
  blockerHint: string | null
): string {
  const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const latest = sorted[0];
  const primaryEvidence = latest ? evidenceByItem.get(latest.id)?.[0] : undefined;
  const secondaryEvidence = sorted[1] ? evidenceByItem.get(sorted[1].id)?.[0] : undefined;
  const lines: string[] = [
    `Theme: ${theme} (${items.length} captures).`,
    latest ? `Latest signal from "${compact(latest.title, 90)}": ${compact(primaryEvidence ?? latest.rawContent, 140)}` : "",
    repeatedIdeas.length > 0 ? `Repeated ideas: ${repeatedIdeas.join(", ")}.` : "Repeated ideas are still emerging.",
    blockerHint ?? "No strong blocker term appears in recent captures.",
    secondaryEvidence ? `Additional context: ${compact(secondaryEvidence, 140)}` : ""
  ].filter((line) => line.length > 0);

  if (mode === "next_step") {
    const summaryLine = latest
      ? `Theme ${theme}; latest context is "${compact(latest.title, 90)}".`
      : `Theme ${theme}; use one item as your re-entry point.`;
    return `- ${compact(summaryLine, 220)}`;
  }
  return lines.slice(0, 5).map((line) => `- ${compact(line, 220)}`).join("\n");
}

export async function synthesizeFromItems(
  repo: RepoLike,
  itemIds: string[],
  mode: SynthesisMode
): Promise<{
  summary: string;
  repeatedIdeas?: string[];
  suggestedNextAction: string;
  reason: string;
}> {
  const uniqueIds = [...new Set(itemIds)];
  const fetched = await Promise.all(uniqueIds.map((id) => repo.getBrainItemById(id)));
  const items = fetched.filter((item): item is BrainItemRecord => Boolean(item));
  if (items.length === 0) {
    return {
      summary: "No item context found for synthesis.",
      suggestedNextAction: "Capture one concrete detail, then retry synthesis.",
      reason: "Grounded suggestions require at least one saved item."
    };
  }

  const theme = inferTheme(items);
  const repeatedIdeas = [...toKeywordCounts(items).entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([token]) => token);
  const blockerHint = detectBlockerHint(items);
  const evidenceByItem = new Map<string, string[]>();
  for (const item of items) {
    evidenceByItem.set(item.id, await buildItemEvidence(repo, item));
  }
  const nextAction = inferNextAction(items, theme, blockerHint);
  const llmResult = await runLlmSynthesis({
    mode,
    theme,
    itemCount: items.length,
    repeatedIdeas,
    blockerHint,
    nextAction,
    evidenceByItem,
    items
  });
  return {
    summary: llmResult?.summary ?? buildSummary(items, repeatedIdeas, theme, mode, evidenceByItem, blockerHint),
    repeatedIdeas: repeatedIdeas.length > 0 ? repeatedIdeas : undefined,
    suggestedNextAction: llmResult?.suggestedNextAction ?? nextAction.suggestedNextAction,
    reason: llmResult?.reason ?? nextAction.reason
  };
}
