type SummarizeProgressPromptItem = {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  topicGuess: string | null;
  latestSummary: string | null;
  latestContinuation: string | null;
  recentTurns: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

type SummarizeProgressPromptTask = {
  title: string;
  status: "todo" | "in_progress" | "done";
  updatedAt: string;
};

type SummarizeProgressPromptSession = {
  taskTitle: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
};

export type SummarizeProgressPromptContext = {
  itemIds: string[];
  items: SummarizeProgressPromptItem[];
  linkedTasks: SummarizeProgressPromptTask[];
  linkedSessions: SummarizeProgressPromptSession[];
  blockerSignals: string[];
  sourceSignals: string[];
};

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeItems(items: SummarizeProgressPromptItem[]): SummarizeProgressPromptItem[] {
  return items.slice(0, 6).map((item) => ({
    ...item,
    title: compact(item.title),
    snippet: compact(item.snippet),
    latestSummary: item.latestSummary ? compact(item.latestSummary) : null,
    latestContinuation: item.latestContinuation ? compact(item.latestContinuation) : null,
    recentTurns: item.recentTurns.slice(0, 3).map((turn) => ({
      ...turn,
      content: compact(turn.content)
    }))
  }));
}

function normalizeTasks(tasks: SummarizeProgressPromptTask[]): SummarizeProgressPromptTask[] {
  return tasks.slice(0, 6).map((task) => ({
    ...task,
    title: compact(task.title)
  }));
}

function normalizeSessions(sessions: SummarizeProgressPromptSession[]): SummarizeProgressPromptSession[] {
  return sessions.slice(0, 6).map((session) => ({
    ...session,
    taskTitle: compact(session.taskTitle)
  }));
}

export function buildSummarizeProgressPrompt(
  context: SummarizeProgressPromptContext
): { instruction: string; groundedContext: string } {
  const normalizedContext = {
    itemIds: context.itemIds.slice(0, 24),
    items: normalizeItems(context.items),
    linkedTasks: normalizeTasks(context.linkedTasks),
    linkedSessions: normalizeSessions(context.linkedSessions),
    blockerSignals: context.blockerSignals.slice(0, 4).map((value) => compact(value)),
    sourceSignals: context.sourceSignals.slice(0, 6).map((value) => compact(value))
  };

  const instruction = [
    "You are Yurbrain's summarize-progress function.",
    "Use ONLY the provided grounded context.",
    "Do not invent tasks, history, blockers, or progress.",
    "Keep output concise and operational, not chatty.",
    "Return EXACTLY one JSON object with this schema:",
    '{"summary":"string","blockers":["string"],"suggestedNextStep":"string","sourceSignals":["string"],"reason":"string"}',
    "Constraints:",
    "- summary: 1-3 short sentences, max 420 chars",
    "- blockers: 0-3 items, each <= 140 chars, include only evidence-backed blockers",
    "- suggestedNextStep: one immediate concrete action, <= 220 chars",
    "- sourceSignals: 1-4 short grounded signals, each <= 160 chars",
    "- reason: one concise justification, <= 220 chars",
    "No markdown, no code fences, no extra keys."
  ].join("\n");

  return {
    instruction,
    groundedContext: JSON.stringify(normalizedContext)
  };
}
