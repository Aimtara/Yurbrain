import type { AppState, BrainItemRecord, MessageRecord, SessionRecord, TaskRecord } from "../../state";

type NextStepSource = "execution_metadata" | "task" | "thread" | "fallback";

type ContinuityContext = {
  item: BrainItemRecord;
  activeTask: TaskRecord | null;
  runningSession: SessionRecord | null;
  comments: MessageRecord[];
  latestComment: MessageRecord | null;
  latestSummaryText: string | null;
  latestClassificationText: string | null;
};

export type ProgressSummarySignals = {
  executionStatus?: "none" | "candidate" | "planned" | "in_progress" | "blocked" | "done";
  linkedTaskStatus?: "todo" | "in_progress" | "done";
  hasRunningSession: boolean;
  commentCount: number;
  latestCommentAt?: string;
};

export type ProgressSummaryResult = {
  summary: string;
  signals: ProgressSummarySignals;
};

export type NextStepResult = {
  nextStep: string;
  reason: string;
  source: NextStepSource;
};

function pickTaskForExecution(tasks: TaskRecord[]): TaskRecord | null {
  if (tasks.length === 0) return null;
  return tasks.find((task) => task.status === "in_progress") ?? tasks.find((task) => task.status === "todo") ?? tasks[0] ?? null;
}

function pickLatestComment(messages: MessageRecord[]): MessageRecord | null {
  if (messages.length === 0) return null;
  return messages.reduce((latest, current) => (current.createdAt > latest.createdAt ? current : latest));
}

function normalizeOneLine(value: string, maxLength: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1))}…`;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function readArtifactContent(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) return null;
  const raw = payload.content;
  if (typeof raw !== "string") return null;
  const compact = normalizeOneLine(raw, 180);
  return compact.length > 0 ? compact : null;
}

async function loadContinuityContext(state: AppState, itemId: string): Promise<ContinuityContext> {
  const item = await state.repo.getBrainItemById(itemId);
  if (!item) {
    throw new Error("brain_item_missing");
  }

  const linkedTasks = await state.repo.listTasksBySourceItem(item.id);
  const activeTask = pickTaskForExecution(linkedTasks);
  const runningSession =
    activeTask
      ? (await state.repo.listSessions({ taskId: activeTask.id, state: "running" }))[0] ?? null
      : null;
  const threads = await state.repo.listThreads(item.id);
  const commentThreads = threads.filter((thread) => thread.kind === "item_comment");
  const comments = (
    await Promise.all(
      commentThreads.map(async (thread) => {
        const messages = await state.repo.listMessagesByThread(thread.id);
        return messages.filter((message) => message.role === "user");
      })
    )
  ).flat();
  const latestComment = pickLatestComment(comments);
  const latestSummaryArtifact = (await state.repo.listArtifactsByItem(item.id, { type: "summary" }))[0] ?? null;
  const latestClassificationArtifact = (await state.repo.listArtifactsByItem(item.id, { type: "classification" }))[0] ?? null;

  return {
    item,
    activeTask,
    runningSession,
    comments,
    latestComment,
    latestSummaryText: readArtifactContent(latestSummaryArtifact?.payload),
    latestClassificationText: readArtifactContent(latestClassificationArtifact?.payload)
  };
}

function buildProgressSummaryFromContext(context: ContinuityContext): ProgressSummaryResult {
  const { item, activeTask, runningSession, comments, latestComment, latestSummaryText, latestClassificationText } = context;
  const commentPreview = latestComment ? normalizeOneLine(latestComment.content, 120) : null;
  const executionProgress = item.execution?.progressSummary ? normalizeOneLine(item.execution.progressSummary, 180) : null;

  const sentences: string[] = [];

  if (runningSession && activeTask) {
    sentences.push(`Momentum is active because you already have a running session on "${normalizeOneLine(activeTask.title, 90)}".`);
  } else if (item.execution?.status && item.execution.status !== "none") {
    sentences.push(`Current execution status is ${statusLabel(item.execution.status)}, based on saved execution metadata.`);
  } else if (activeTask) {
    sentences.push(`This item is linked to "${normalizeOneLine(activeTask.title, 90)}" (${statusLabel(activeTask.status)}), which is your strongest execution signal.`);
  } else {
    sentences.push("No active execution signal yet, so this item is still in continuity mode.");
  }

  if (executionProgress) {
    sentences.push(`Saved progress: ${executionProgress}`);
  } else if (latestSummaryText) {
    sentences.push(`Recent context summary: ${latestSummaryText}`);
  } else if (commentPreview) {
    sentences.push(`Latest continuation note: "${commentPreview}".`);
  } else if (latestClassificationText) {
    sentences.push(`Latest AI signal: ${latestClassificationText}.`);
  }

  if (item.execution?.nextStep?.trim()) {
    sentences.push(`Smallest next move: ${normalizeOneLine(item.execution.nextStep, 130)}`);
  } else if (activeTask?.status === "in_progress") {
    sentences.push(`Smallest next move: spend 10 minutes resuming "${normalizeOneLine(activeTask.title, 90)}".`);
  } else if (activeTask?.status === "todo") {
    sentences.push(`Smallest next move: start "${normalizeOneLine(activeTask.title, 90)}" and produce one concrete output.`);
  } else if (!latestSummaryText && !commentPreview) {
    sentences.push("Smallest next move: add one short continuation note describing what changed.");
  }

  return {
    summary: normalizeOneLine(sentences.join(" "), 520),
    signals: {
      executionStatus: item.execution?.status,
      linkedTaskStatus: activeTask?.status,
      hasRunningSession: Boolean(runningSession),
      commentCount: comments.length,
      latestCommentAt: latestComment?.createdAt
    }
  };
}

function buildNextStepFromContext(context: ContinuityContext): NextStepResult {
  const { item, activeTask, runningSession, latestComment, latestSummaryText } = context;

  if (item.execution?.nextStep?.trim()) {
    return {
      nextStep: normalizeOneLine(item.execution.nextStep, 220),
      reason: `Using your saved execution metadata because status is ${statusLabel(item.execution.status)}.`,
      source: "execution_metadata"
    };
  }

  if (activeTask?.status === "in_progress") {
    return {
      nextStep: `Spend 10 minutes resuming "${normalizeOneLine(activeTask.title, 120)}" and leave one progress note before stopping.`,
      reason: runningSession
        ? "Resume this because a running session is already active on the task."
        : "Resume this because task status is already in progress.",
      source: "task"
    };
  }

  if (activeTask?.status === "todo") {
    return {
      nextStep: `Start "${normalizeOneLine(activeTask.title, 120)}" with a 10-minute kickoff and finish one concrete sub-step.`,
      reason: "Start this because a linked task is ready but not started yet.",
      source: "task"
    };
  }

  if (latestComment) {
    return {
      nextStep: "Turn your latest continuation note into one action you can complete in under 10 minutes.",
      reason: `Use this because your latest continuation note already contains context: "${normalizeOneLine(latestComment.content, 110)}".`,
      source: "thread"
    };
  }

  if (latestSummaryText) {
    return {
      nextStep: "Re-open this item and write one continuation note that confirms what changed since the latest summary.",
      reason: `Do this because a recent summary exists but no execution anchor is active: "${latestSummaryText}".`,
      source: "fallback"
    };
  }

  return {
    nextStep: "Add one note, then pick one 10-minute smallest action you can start and finish now.",
    reason: "Do this because no task, session, or recent continuation signal is active yet.",
    source: "fallback"
  };
}

export async function summarizeProgressForItem(state: AppState, itemId: string): Promise<ProgressSummaryResult> {
  const context = await loadContinuityContext(state, itemId);
  return buildProgressSummaryFromContext(context);
}

export async function suggestNextStepForItem(state: AppState, itemId: string): Promise<NextStepResult> {
  const context = await loadContinuityContext(state, itemId);
  return buildNextStepFromContext(context);
}

export function buildContinuityFallbackSummary(itemTitle: string): string {
  return normalizeOneLine(
    `Continuity snapshot for "${itemTitle}": no reliable progress signals were available, so start by adding one short note about what changed and what still matters.`,
    520
  );
}

export function buildContinuityFallbackNextStep(itemTitle: string): string {
  return normalizeOneLine(
    `Open "${itemTitle}", add one continuation note, and pick one 10-minute action you can complete now or intentionally snooze.`,
    220
  );
}
