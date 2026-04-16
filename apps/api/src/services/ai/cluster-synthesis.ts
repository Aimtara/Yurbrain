import type { BrainItemRecord, MessageRecord, SessionRecord, TaskRecord } from "../../state";

export type ClusterSynthesisResult = {
  summary: string;
  repeatedIdeas?: string[];
  suggestedNextAction: string;
  reason: string;
};

export type ClusterSynthesisInput = {
  items: BrainItemRecord[];
  messages: MessageRecord[];
  tasks: TaskRecord[];
  sessions: SessionRecord[];
};

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "before",
  "between",
  "could",
  "from",
  "have",
  "into",
  "just",
  "only",
  "some",
  "such",
  "that",
  "there",
  "these",
  "they",
  "this",
  "those",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

type Mode = "summary" | "next_step";

type ExecutionSignals = {
  messageCount: number;
  linkedTaskCount: number;
  runningSessionCount: number;
  pausedSessionCount: number;
  blockedTask: TaskRecord | null;
};

export function synthesizeCluster(input: ClusterSynthesisInput, mode: Mode): ClusterSynthesisResult {
  const { items, messages, tasks, sessions } = input;
  const topKeywords = extractTopKeywords(items, messages, 4);
  const repeatedIdeas = topKeywords.length > 0 ? topKeywords.slice(0, 3).map((keyword) => `Repeated focus on ${keyword}.`) : undefined;
  const executionSignals = deriveExecutionSignals(messages, tasks, sessions);
  const anchor = selectAnchorItem(items, executionSignals.blockedTask);
  const summary = buildSummary(mode, items, topKeywords, executionSignals, anchor);
  const suggestedNextAction = buildSuggestedNextAction(topKeywords, items, executionSignals, anchor);
  const reason = buildReason(topKeywords, items.length, executionSignals, anchor);
  return {
    summary,
    repeatedIdeas,
    suggestedNextAction,
    reason
  };
}

function summarizeItem(item: BrainItemRecord): string {
  const source = item.title.trim().length > 0 ? item.title : "Captured item";
  const snippet = item.rawContent.trim().replace(/\s+/g, " ").slice(0, 92);
  if (!snippet) return source;
  return `${source}: ${snippet}${snippet.length >= 92 ? "..." : ""}`;
}

function buildSummary(
  mode: Mode,
  items: BrainItemRecord[],
  keywords: string[],
  signals: ExecutionSignals,
  anchor: BrainItemRecord | null
): string {
  if (mode === "next_step") {
    return clamp(
      [
        `Current continuity: ${items.length} captures, ${signals.messageCount} thread updates, ${signals.linkedTaskCount} linked tasks`,
        signals.pausedSessionCount > 0 ? `, ${signals.pausedSessionCount} paused sessions` : "",
        "."
      ].join(""),
      1_500
    );
  }

  const bullets: string[] = [];
  if (keywords.length > 0) {
    bullets.push(`Theme: ${keywords.slice(0, 2).join(", ")}.`);
  } else {
    bullets.push(`Theme is still emerging across ${items.length} captures.`);
  }
  bullets.push(
    `Signals: ${signals.messageCount} thread updates, ${signals.linkedTaskCount} linked tasks, ${signals.runningSessionCount} running sessions.`
  );
  if (signals.pausedSessionCount > 0) {
    bullets.push(`Blocker: ${signals.pausedSessionCount} paused sessions are interrupting momentum.`);
  } else if (signals.linkedTaskCount === 0) {
    bullets.push("Execution not started yet; captures are still in hold mode.");
  }
  if (anchor) {
    bullets.push(`Anchor item: ${summarizeItem(anchor)}.`);
  }
  return bullets
    .slice(0, 5)
    .map((bullet) => `- ${clamp(bullet, 220)}`)
    .join("\n");
}

function buildSuggestedNextAction(
  keywords: string[],
  items: BrainItemRecord[],
  signals: ExecutionSignals,
  anchor: BrainItemRecord | null
): string {
  const blockedItem = resolveItemForTask(signals.blockedTask, items);
  if (blockedItem && signals.pausedSessionCount > 0) {
    return clamp(`Resume "${blockedItem.title}" by adding one unblock note, then restart its paused session.`, 220);
  }
  const todoTask = signals.blockedTask;
  if (todoTask) {
    const taskItem = resolveItemForTask(todoTask, items);
    if (taskItem) {
      return clamp(`Open "${taskItem.title}" and complete one 10-minute step tied to the existing task.`, 220);
    }
  }
  if (anchor && keywords.length > 0) {
    return clamp(`Re-open "${anchor.title}" and add one concrete ${keywords[0]} update today.`, 220);
  }
  if (anchor) {
    return clamp(`Re-open "${anchor.title}" and capture one concrete next move today.`, 220);
  }
  return "Choose one item and write one concrete next move.";
}

function buildReason(keywords: string[], itemCount: number, signals: ExecutionSignals, anchor: BrainItemRecord | null): string {
  if (signals.pausedSessionCount > 0) {
    return clamp(
      `This recommendation prioritizes recovery from ${signals.pausedSessionCount} paused sessions across ${signals.linkedTaskCount} linked tasks.`,
      220
    );
  }
  if (signals.linkedTaskCount > 0) {
    return clamp(`This action uses ${signals.linkedTaskCount} linked tasks and ${signals.messageCount} thread updates as execution signals.`, 220);
  }
  if (keywords.length > 0) {
    return clamp(`This action is grounded in repeated ${keywords[0]} patterns across ${itemCount} saved items.`, 220);
  }
  if (anchor) {
    return clamp(`This action starts from "${anchor.title}" because execution history is still light for this cluster.`, 220);
  }
  return clamp(`This action keeps continuity moving across ${itemCount} related captures without adding extra structure.`, 220);
}

function extractTopKeywords(items: BrainItemRecord[], messages: MessageRecord[], maxKeywords: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const topic = normalizeToken(item.topicGuess);
    if (topic) {
      counts.set(topic, (counts.get(topic) ?? 0) + 2);
    }
    for (const token of tokenize(`${item.title} ${item.rawContent}`)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  for (const message of messages) {
    for (const token of tokenize(message.content)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxKeywords)
    .map(([token]) => token);
}

function deriveExecutionSignals(messages: MessageRecord[], tasks: TaskRecord[], sessions: SessionRecord[]): ExecutionSignals {
  const taskIds = new Set(tasks.map((task) => task.id));
  const linkedSessions = sessions.filter((session) => taskIds.has(session.taskId));
  const runningSessionCount = linkedSessions.filter((session) => session.state === "running").length;
  const pausedSessionCount = linkedSessions.filter((session) => session.state === "paused").length;
  const blockedTask =
    tasks.find((task) => linkedSessions.some((session) => session.taskId === task.id && session.state === "paused")) ??
    tasks.find((task) => task.status === "todo") ??
    null;
  return {
    messageCount: messages.length,
    linkedTaskCount: tasks.length,
    runningSessionCount,
    pausedSessionCount,
    blockedTask
  };
}

function selectAnchorItem(items: BrainItemRecord[], blockedTask: TaskRecord | null): BrainItemRecord | null {
  if (blockedTask?.sourceItemId) {
    const blockedItem = items.find((item) => item.id === blockedTask.sourceItemId);
    if (blockedItem) return blockedItem;
  }
  const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return sorted[0] ?? null;
}

function resolveItemForTask(task: TaskRecord | null, items: BrainItemRecord[]): BrainItemRecord | null {
  if (!task?.sourceItemId) return null;
  return items.find((item) => item.id === task.sourceItemId) ?? null;
}

function clamp(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trimEnd()}...`;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function normalizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
  return normalized.length > 0 ? normalized : null;
}
