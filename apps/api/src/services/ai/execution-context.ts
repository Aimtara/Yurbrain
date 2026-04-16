import type { AppState, FeedCardRecord, MessageRecord, SessionRecord, TaskRecord } from "../../state";

type ItemExecutionContext = {
  itemTitle: string;
  changed: string;
  done: string;
  blocked: string;
  nextMove: string;
  recommendation: string;
  reason: string;
};

function compactLine(input: string, limit = 120): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, Math.max(1, limit - 1))}…`;
}

function sortByCreatedAtAsc<T extends { createdAt: string }>(values: T[]): T[] {
  return [...values].sort((left, right) => {
    const leftValue = new Date(left.createdAt).getTime();
    const rightValue = new Date(right.createdAt).getTime();
    if (Number.isFinite(leftValue) && Number.isFinite(rightValue) && leftValue !== rightValue) {
      return leftValue - rightValue;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
}

function latestMessage(messages: MessageRecord[], role: MessageRecord["role"]): MessageRecord | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (candidate.role === role) return candidate;
  }
  return null;
}

function latestSession(sessions: SessionRecord[]): SessionRecord | null {
  if (sessions.length === 0) return null;
  return [...sessions].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null;
}

function pickPrimaryTask(tasks: TaskRecord[]): TaskRecord | null {
  if (tasks.length === 0) return null;
  return tasks.find((task) => task.status !== "done") ?? tasks[0] ?? null;
}

function pickPrimaryCard(cards: FeedCardRecord[]): FeedCardRecord | null {
  if (cards.length === 0) return null;
  return [...cards].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

function describeDone(tasks: TaskRecord[]): string {
  if (tasks.length === 0) return "No linked task yet";
  const doneCount = tasks.filter((task) => task.status === "done").length;
  if (doneCount === 0) return "Linked tasks not completed yet";
  if (doneCount === tasks.length) return `All ${doneCount} linked task${doneCount === 1 ? "" : "s"} completed`;
  return `${doneCount} of ${tasks.length} linked tasks completed`;
}

function describeBlocked(task: TaskRecord | null, session: SessionRecord | null, card: FeedCardRecord | null): string {
  if (task?.status === "in_progress" && session?.state === "running") {
    return "No strong blocker signal";
  }
  const postponeCount = card?.postponeCount ?? 0;
  if (postponeCount >= 2) {
    return `Postponed ${postponeCount} times`;
  }
  if (task?.status === "in_progress" && session?.state === "paused") {
    return "In-progress task is paused";
  }
  if (task?.status === "todo" && postponeCount > 0) {
    return "Task exists but keeps getting deferred";
  }
  return "No strong blocker signal";
}

function describeRecommendation(task: TaskRecord | null, session: SessionRecord | null, blocked: string): string {
  if (blocked.startsWith("Postponed")) {
    return "Revisit this deferred item now";
  }
  if (task?.status === "in_progress" && session?.state === "paused") {
    return "Resume the paused task now";
  }
  if (task?.status === "in_progress" && session?.state === "running") {
    return "Keep the active task moving";
  }
  if (task?.status === "todo") {
    return "Start the linked task now";
  }
  if (task?.status === "done") {
    return "Close the loop with a reflection note";
  }
  return "Continue this item now";
}

function describeNextMove(task: TaskRecord | null, session: SessionRecord | null, blocked: string): string {
  if (blocked.startsWith("Postponed")) {
    return "Re-open it and write one unblock note, then postpone only if needed";
  }
  if (task?.status === "in_progress" && session?.state === "paused") {
    return "Resume the paused session for 15 minutes";
  }
  if (task?.status === "in_progress" && session?.state === "running") {
    return "Keep the running session focused on one concrete sub-step";
  }
  if (task?.status === "todo") {
    return "Start the linked task with one short session";
  }
  if (task?.status === "done") {
    return "Add a closure note, then return to feed";
  }
  return "Leave one continuation note, then convert the clearest next step";
}

function describeReason(task: TaskRecord | null, blocked: string): string {
  if (blocked.startsWith("Postponed")) {
    return "Repeated postpones signal scope or dependency friction";
  }
  if (task?.status === "in_progress") {
    return "Execution context already exists, so continuing is lower friction than switching";
  }
  if (task?.status === "todo") {
    return "A linked task already exists, so starting is the lowest-friction way forward";
  }
  if (task?.status === "done") {
    return "Closure keeps this loop from resurfacing without context";
  }
  return "This keeps continuity alive without adding structure overhead";
}

export async function buildItemExecutionContext(state: AppState, itemId: string): Promise<ItemExecutionContext> {
  const item = await state.repo.getBrainItemById(itemId);
  if (!item) {
    return {
      itemTitle: "Item",
      changed: "No item context found",
      done: "No linked task yet",
      blocked: "No strong blocker signal",
      nextMove: "Open the item and leave one continuation note",
      recommendation: "Re-open this item",
      reason: "Continuity data is still thin"
    };
  }

  const [threads, allTasks, feedCards] = await Promise.all([
    state.repo.listThreads(itemId),
    state.repo.listTasks({ userId: item.userId }),
    state.repo.listFeedCardsByUser(item.userId)
  ]);
  const linkedTasks = allTasks.filter((task) => task.sourceItemId === itemId);
  const primaryTask = pickPrimaryTask(linkedTasks);
  const sessions = primaryTask ? await state.repo.listSessions({ taskId: primaryTask.id }) : [];
  const primarySession = latestSession(sessions);
  const linkedCards = feedCards.filter((card) => card.itemId === itemId);
  const primaryCard = pickPrimaryCard(linkedCards);

  const messagesByThread = await Promise.all(threads.map((thread) => state.repo.listMessagesByThread(thread.id)));
  const messages = sortByCreatedAtAsc(messagesByThread.flat());
  const latestUser = latestMessage(messages, "user");
  const latestAssistant = latestMessage(messages, "assistant");

  const changed =
    compactLine(latestUser?.content ?? latestAssistant?.content ?? item.rawContent) || "No continuation update captured yet";
  const done = describeDone(linkedTasks);
  const blocked = describeBlocked(primaryTask, primarySession, primaryCard);
  const recommendation = describeRecommendation(primaryTask, primarySession, blocked);
  const nextMove = describeNextMove(primaryTask, primarySession, blocked);
  const reason = describeReason(primaryTask, blocked);

  return {
    itemTitle: compactLine(item.title, 80),
    changed,
    done,
    blocked,
    nextMove,
    recommendation,
    reason
  };
}
