type NextStepPromptItem = {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  topicGuess: string | null;
  latestContinuation: string | null;
  recentTurns: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

type NextStepPromptTask = {
  title: string;
  status: "todo" | "in_progress" | "done";
  updatedAt: string;
  sourceItemId: string | null;
};

type NextStepPromptSession = {
  taskTitle: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
};

export type NextStepPromptContext = {
  itemIds: string[];
  items: NextStepPromptItem[];
  linkedTasks: NextStepPromptTask[];
  linkedSessions: NextStepPromptSession[];
  sourceSignals: string[];
  deterministicSuggestion: string;
  deterministicReason: string;
};

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeItems(items: NextStepPromptItem[]): NextStepPromptItem[] {
  return items.slice(0, 6).map((item) => ({
    ...item,
    title: compact(item.title),
    snippet: compact(item.snippet),
    latestContinuation: item.latestContinuation ? compact(item.latestContinuation) : null,
    recentTurns: item.recentTurns.slice(0, 3).map((turn) => ({
      ...turn,
      content: compact(turn.content)
    }))
  }));
}

function normalizeTasks(tasks: NextStepPromptTask[]): NextStepPromptTask[] {
  return tasks.slice(0, 6).map((task) => ({
    ...task,
    title: compact(task.title)
  }));
}

function normalizeSessions(sessions: NextStepPromptSession[]): NextStepPromptSession[] {
  return sessions.slice(0, 6).map((session) => ({
    ...session,
    taskTitle: compact(session.taskTitle)
  }));
}

export function buildWhatShouldIDoNextPrompt(
  context: NextStepPromptContext
): { instruction: string; groundedContext: string } {
  const normalizedContext = {
    itemIds: context.itemIds.slice(0, 24),
    items: normalizeItems(context.items),
    linkedTasks: normalizeTasks(context.linkedTasks),
    linkedSessions: normalizeSessions(context.linkedSessions),
    sourceSignals: context.sourceSignals.slice(0, 6).map((value) => compact(value)),
    deterministicSuggestion: compact(context.deterministicSuggestion),
    deterministicReason: compact(context.deterministicReason)
  };

  const instruction = [
    "You are Yurbrain's what-should-i-do-next function.",
    "Use ONLY the provided grounded context.",
    "Do not invent tasks, blockers, timelines, or project history.",
    "Output must be concise and operational, not chatty.",
    "Return EXACTLY one JSON object with this schema:",
    '{"summary":"string","suggestedNextStep":"string","sourceSignals":["string"],"reason":"string","confidence":0.0}',
    "Constraints:",
    "- summary: one short sentence, <= 220 chars",
    "- suggestedNextStep: one immediate concrete action, <= 220 chars",
    "- sourceSignals: 1-4 grounded signals, each <= 160 chars",
    "- reason: one concise justification, <= 220 chars",
    "- confidence: number in [0,1], calibrated to groundedness of this exact next step",
    "- suggestedNextStep must stay single-step (no multi-step plan)",
    "- Use at most the provided recentTurns; never assume hidden or full conversation history.",
    "No markdown, no code fences, no extra keys."
  ].join("\n");

  return {
    instruction,
    groundedContext: JSON.stringify(normalizedContext)
  };
}
