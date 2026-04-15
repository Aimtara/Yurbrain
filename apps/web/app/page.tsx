"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiClient,
  classifyBrainItem,
  convertToTask,
  createBrainItem,
  createTask,
  createThread,
  dismissFeedCard,
  endpoints,
  finishSession,
  getFeed,
  listBrainItemArtifacts,
  listSessions,
  getUserPreference,
  listThreadMessages,
  listThreadsByTarget,
  pauseSession,
  queryBrainItemThread,
  refreshFeedCard,
  sendMessage,
  snoozeFeedCard,
  startTaskSession,
  summarizeBrainItem,
  updateTask,
  updateUserPreference
} from "@yurbrain/client";
import {
  ActiveSessionScreen,
  CaptureComposer,
  ExecutionLensBar,
  FeedCard,
  FinishRebalanceSheet,
  FocusFeedScreen,
  FounderModeToggle,
  FounderSummarySurface,
  ItemChatPanel,
  ItemDetailScreen,
  PlanPreviewSheet,
  PostponeRescheduleSheet,
  TaskDetailCard,
  TimeWindowSelector,
  type CaptureSubmitIntent,
  type ExecutionLens,
  type FeedCardVariant,
  type FeedLens,
  type TimeWindowOption
} from "@yurbrain/ui";

type Surface = "feed" | "item" | "session" | "time" | "me";

type FeedCardDto = {
  id: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: FeedLens;
  itemId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil: string | null;
  refreshCount: number;
  postponeCount: number;
  lastPostponedAt: string | null;
  lastRefreshedAt: string | null;
  availableActions: Array<"open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh">;
  stateFlags: {
    dismissed: boolean;
    snoozed: boolean;
    actionable: boolean;
    hasSourceItem: boolean;
    hasSourceTask: boolean;
  };
  whyShown: {
    summary: string;
    reasons: string[];
  };
  createdAt: string;
};

type FeedAction = FeedCardDto["availableActions"][number];

type ItemArtifactDto = {
  id: string;
  type: "summary" | "classification" | "relation" | "feed_card";
  payload: Record<string, unknown>;
  createdAt: string;
};

type BrainItemDto = {
  id: string;
  userId: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  title: string;
  rawContent: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

type ThreadDto = {
  id: string;
  targetItemId: string;
  kind: "item_comment" | "item_chat";
  createdAt: string;
  updatedAt: string;
};

type MessageDto = {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type TaskDto = {
  id: string;
  userId: string;
  sourceItemId: string | null;
  sourceMessageId?: string | null;
  title: string;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
};

type SessionDto = {
  id: string;
  taskId: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
};

type ActiveTaskContextPeek = {
  title: string;
  excerpt: string;
  updatedAt?: string;
};

type UserPreferenceDto = {
  userId: string;
  defaultLens: FeedLens;
  cleanFocusMode: boolean;
  founderMode: boolean;
  updatedAt: string;
};

type ConvertResponse =
  | {
      outcome: "task_created";
      confidence: number;
      task: TaskDto;
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    }
  | {
      outcome: "plan_suggested";
      confidence: number;
      title: string;
      steps: string[];
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    }
  | {
      outcome: "not_recommended";
      confidence: number;
      reason: string;
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    };

type PlanPreviewDraft = {
  sourceItemId: string;
  title: string;
  steps: Array<{ id: string; title: string; minutes: number }>;
  confidence: number;
};

type PostponeDraft = {
  cardId: string;
  title: string;
  itemId: string | null;
  postponeCount: number;
};

type FinishRebalanceDraft = {
  taskTitle: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  suggestion: string;
};

type MeInsights = {
  topInsight: string;
  estimationAccuracy: {
    label: string;
    detail: string;
  };
  carryForward: {
    label: string;
    detail: string;
  };
  postponement: {
    label: string;
    detail: string;
  };
  recommendation: string;
};

type ContinuityContext = {
  whyShown?: string;
  whereLeftOff?: string;
  changedSince?: string;
  blockedState?: string;
  nextStep?: string;
  lastTouched?: string;
  sourceItemId?: string;
  sourceItemTitle?: string;
};

type FeedCardModel = {
  card: FeedCardDto;
  variant: FeedCardVariant;
  continuity: ContinuityContext;
};

const userId = "11111111-1111-1111-1111-111111111111";
const storageKeys = {
  activeLens: "yurbrain.activeLens",
  selectedItemId: "yurbrain.selectedItemId",
  selectedTaskId: "yurbrain.selectedTaskId",
  founderMode: "yurbrain.founderMode",
  executionLens: "yurbrain.executionLens",
  activeSurface: "yurbrain.activeSurface",
  timeWindow: "yurbrain.timeWindow",
  customWindowMinutes: "yurbrain.customWindowMinutes"
} as const;

const captureSuccessMessages: Record<CaptureSubmitIntent, string> = {
  save: "Saved. Returning you to the feed.",
  save_and_plan: "Saved and routed into lightweight planning.",
  save_and_remind: "Saved. Reminder stub captured for follow-up."
};

function normalizePlanStepMinutes(index: number): number {
  return index === 0 ? 20 : 15;
}

const promptStopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "about",
  "into",
  "have",
  "has",
  "were",
  "been",
  "what",
  "when",
  "where"
]);

const timeWindowMinutes: Record<Exclude<TimeWindowOption, "custom">, number> = {
  "2h": 120,
  "4h": 240,
  "6h": 360,
  "8h": 480,
  "24h": 1440
};

function deriveArtifactText(payload: Record<string, unknown>): string {
  if (typeof payload.content === "string" && payload.content.trim().length > 0) {
    return payload.content;
  }
  if (Array.isArray(payload.labels) && payload.labels.every((label) => typeof label === "string")) {
    return `Labels: ${payload.labels.join(", ")}`;
  }
  if (typeof payload.rationale === "string" && payload.rationale.trim().length > 0) {
    return payload.rationale;
  }
  return JSON.stringify(payload);
}

function tokenizeForSimilarity(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !promptStopWords.has(token));
}

function buildRelatedItems(currentItem: BrainItemDto | null, items: BrainItemDto[]): Array<{ id: string; title: string; hint: string }> {
  if (!currentItem) return [];

  const currentTokens = new Set(tokenizeForSimilarity(`${currentItem.title} ${currentItem.rawContent}`));
  const candidates = items
    .filter((item) => item.id !== currentItem.id)
    .map((item) => {
      const tokens = tokenizeForSimilarity(`${item.title} ${item.rawContent}`);
      const overlap = tokens.filter((token) => currentTokens.has(token));
      return {
        id: item.id,
        title: item.title,
        overlapCount: overlap.length,
        hint: overlap[0] ? `Shares context around "${overlap[0]}"` : "Resurfaces adjacent thinking",
        updatedAt: item.updatedAt
      };
    })
    .sort((left, right) => {
      if (right.overlapCount !== left.overlapCount) return right.overlapCount - left.overlapCount;
      return right.updatedAt.localeCompare(left.updatedAt);
    });

  return candidates.slice(0, 3).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    hint: candidate.hint
  }));
}

function buildSuggestedPrompts(item: BrainItemDto, nextStep?: string): string[] {
  const prompts = [
    `Summarize progress on "${item.title}".`,
    `What should I do next on "${item.title}"? Give one recommendation, one reason, and one next move.`,
    nextStep ? `Sharpen this next move into one action with one reason: ${nextStep}` : `Give one 10-minute action for "${item.title}" with one reason.`
  ];

  return Array.from(new Set(prompts)).slice(0, 3);
}

function selectActiveSession(sessions: SessionDto[]): SessionDto | null {
  if (sessions.length === 0) return null;
  const live = sessions.find((session) => session.state !== "finished");
  return live ?? sessions[0] ?? null;
}

function formatRelative(isoValue?: string): string | undefined {
  if (!isoValue) return undefined;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return undefined;
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function inferVariant(card: FeedCardDto, relatedTask?: TaskDto, relatedSession?: SessionDto): FeedCardVariant {
  if (card.stateFlags.dismissed) return "done";
  if (relatedTask?.status === "done") return "done";
  if (relatedSession?.state === "running") return "execution";
  const postponeCount = card.postponeCount ?? 0;
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if ((blockedState && relatedSession?.state !== "running") || postponeCount >= 2) return "blocked";
  if (relatedTask?.status === "in_progress" || card.cardType === "resume") return "execution";
  if (card.cardType === "open_loop") return "resume";
  const summary = card.whyShown.summary.toLowerCase();
  if (summary.includes("resume") || summary.includes("revisit") || summary.includes("return")) return "resume";
  if (summary.includes("in progress") || summary.includes("next step") || summary.includes("continue")) return "execution";
  return "default";
}

function inferBlockedState(card: FeedCardDto, relatedTask?: TaskDto, relatedSession?: SessionDto): string | undefined {
  const postponeCount = card.postponeCount ?? 0;
  if (postponeCount >= 2) {
    const lastPostponed = formatRelative(card.lastPostponedAt ?? undefined);
    return lastPostponed ? `Postponed ${postponeCount} times (last ${lastPostponed})` : `Postponed ${postponeCount} times`;
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") {
    return "Task is in progress but not actively moving.";
  }
  if (relatedTask?.status === "todo" && postponeCount > 0) {
    return "Task exists but keeps getting deferred.";
  }
  const explicitReason = card.whyShown.reasons.find((reason) => /blocked|waiting|stuck|dependency|approval|review/i.test(reason));
  if (explicitReason) return explicitReason;
  if (/blocked|waiting|stale|stuck/i.test(card.whyShown.summary)) {
    return card.whyShown.summary;
  }
  return undefined;
}

function inferNextStep(card: FeedCardDto, variant: FeedCardVariant, relatedTask?: TaskDto, relatedSession?: SessionDto, relatedItem?: BrainItemDto): string {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (relatedTask?.status === "todo") {
    if (relatedItem) {
      return `Open "${relatedItem.title}" and start the linked task with one focused 15-minute session.`;
    }
    return "Start the linked task with one focused 15-minute session.";
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") return "Resume your paused session and finish one concrete sub-step.";
  if (relatedTask?.status === "in_progress") return "Resume execution and finish one concrete sub-step.";
  if (relatedTask?.status === "done") return "Close the loop with one reflection note.";
  const reasonWithStep = card.whyShown.reasons.find((reason) => /next|step|follow|continue|resume/i.test(reason));
  if (reasonWithStep) return reasonWithStep;
  if (variant === "blocked") {
    if (blockedState?.startsWith("Postponed")) {
      return "Re-open this and write one unblock note before postponing again.";
    }
    return "Resolve the blocker with one message or one smaller scope cut.";
  }
  if (variant === "done") return "Close the loop with a reflection note, then return to feed.";
  return "Open and add one continuation note.";
}

function inferContinuityNote(card: FeedCardDto, variant: FeedCardVariant, relatedTask?: TaskDto, relatedSession?: SessionDto): string | undefined {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (variant === "blocked" && blockedState) {
    return `Blocked signal: ${blockedState}`;
  }
  return card.whyShown.reasons.find((reason) => !/next|step|follow|continue|resume/i.test(reason));
}

function inferWhereLeftOff(card: FeedCardDto, variant: FeedCardVariant, relatedTask?: TaskDto, relatedSession?: SessionDto, relatedItem?: BrainItemDto): string | undefined {
  const blockedState = inferBlockedState(card, relatedTask, relatedSession);
  if (variant === "blocked" && blockedState) {
    return `Last state: ${blockedState}`;
  }
  if (!card.itemId && relatedTask?.sourceItemId && relatedItem) {
    return `Converted from "${relatedItem.title}" and queued for execution.`;
  }
  if (relatedTask?.status === "in_progress" && relatedSession?.state === "paused") return "Execution is paused and ready to resume.";
  if (relatedTask?.status === "in_progress") return "Execution is already in progress.";
  if (relatedTask?.status === "todo") return "You already converted this into a lightweight task.";
  if (relatedTask?.status === "done") return "The linked task is done; this is back for closure.";
  return card.whyShown.reasons.find((reason) => /left|last|previous|revisit|resume/i.test(reason));
}

function inferPrimaryActionLabel(card: FeedCardDto, canOpenContinuity: boolean): string {
  if (canOpenContinuity) return "Open continuity";
  if (card.stateFlags.hasSourceTask) return "Open execution";
  if (card.stateFlags.hasSourceItem) return "Open continuity";
  return "Open";
}

function summarizeExecutionHint(task: TaskDto | null, session: SessionDto | null): string | undefined {
  if (!task) return undefined;
  if (task.status === "done") return "Task completed.";
  if (task.status === "in_progress") {
    if (session?.state === "running") return "Task in progress with a running session.";
    if (session?.state === "paused") return "Task in progress with a paused session.";
    return "Task in progress.";
  }
  return "Task is queued as the next lightweight step.";
}

function buildSyntheticDetailCard(item: BrainItemDto | null, task: TaskDto | null, continuity: ContinuityContext | null): FeedCardDto {
  const continuityReasons = [continuity?.blockedState, continuity?.changedSince].filter((reason): reason is string => Boolean(reason));
  return {
    id: item?.id ?? "detail-view",
    cardType: "item",
    lens: "all",
    itemId: item?.id ?? null,
    taskId: task?.id ?? null,
    title: item?.title ?? "Item",
    body: item?.rawContent ?? "",
    dismissed: false,
    snoozedUntil: null,
    refreshCount: 0,
    postponeCount: 0,
    lastPostponedAt: null,
    lastRefreshedAt: null,
    availableActions: ["open_item", "comment", "convert_to_task", "dismiss", "snooze", "refresh"],
    stateFlags: {
      dismissed: false,
      snoozed: false,
      actionable: true,
      hasSourceItem: true,
      hasSourceTask: Boolean(task)
    },
    whyShown: {
      summary: continuity?.whyShown ?? "Continue this item in one small step.",
      reasons: continuityReasons
    },
    createdAt: item?.createdAt ?? new Date().toISOString()
  };
}

function matchesExecutionLens(variant: FeedCardVariant, lens: ExecutionLens): boolean {
  if (lens === "all") return true;
  if (lens === "ready_to_move") return variant === "execution" || variant === "resume";
  if (lens === "needs_unblock") return variant === "blocked";
  return variant === "execution" || variant === "done";
}

function supportsAction(card: FeedCardDto, action: FeedAction): boolean {
  return card.availableActions.includes(action);
}

function resolveTimeWindowMinutes(window: TimeWindowOption, customMinutes: number): number {
  if (window === "custom") return Math.max(30, Math.min(1440, Math.trunc(customMinutes)));
  return timeWindowMinutes[window];
}

function estimateTaskMinutes(task: TaskDto): number {
  const tokenCount = task.title
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const base = 15 + tokenCount * 4;
  const statusAdjustment = task.status === "in_progress" ? 10 : 0;
  return Math.max(15, Math.min(180, base + statusAdjustment));
}

function formatSessionClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function deriveSessionElapsedSeconds(session: SessionDto | null): number {
  if (!session) return 0;
  const startValue = new Date(session.startedAt).getTime();
  if (!Number.isFinite(startValue)) return 0;
  const endValue = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  if (!Number.isFinite(endValue)) return 0;
  return Math.max(0, Math.floor((endValue - startValue) / 1000));
}

function formatDurationLabel(seconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}

function calculatePlannedMinutesForSession(task: TaskDto | null): number {
  if (!task) return 25;
  return estimateTaskMinutes(task);
}

function buildRebalanceSuggestion(deltaMinutes: number): string {
  if (deltaMinutes > 20) {
    return "This took longer than expected. Trim one optional follow-up so your next step stays lightweight.";
  }
  if (deltaMinutes > 0) {
    return "Small overflow is normal. Keep your next step focused and avoid stacking new tasks.";
  }
  if (deltaMinutes < -15) {
    return "You reclaimed time here. Consider using a short block to close one nearby open loop.";
  }
  if (deltaMinutes < 0) {
    return "You finished a little early. Keep that momentum with one tiny continuation step.";
  }
  return "Nice pacing. Keep the same rhythm for your next focused session.";
}

function classifyAccuracyRatio(ratio: number | null): { label: string; detail: string } {
  if (ratio === null) {
    return {
      label: "Not enough finished sessions yet",
      detail: "Complete a couple of focus sessions and this will calibrate your timing pattern."
    };
  }
  if (ratio <= 0.85) {
    return {
      label: "You usually finish faster than planned",
      detail: "Try slightly shorter estimates so your plan mirrors your natural pace."
    };
  }
  if (ratio >= 1.2) {
    return {
      label: "Sessions often run longer than planned",
      detail: "Protect momentum by splitting larger steps before starting."
    };
  }
  return {
    label: "Your estimates are close to reality",
    detail: "Keep using this rhythm. Your planning and execution are aligned."
  };
}

function buildMeInsights(input: {
  tasks: TaskDto[];
  sessions: SessionDto[];
  feedCards: FeedCardDto[];
}): MeInsights {
  const doneTasks = input.tasks.filter((task) => task.status === "done");
  const todoTasks = input.tasks.filter((task) => task.status === "todo");
  const inProgressTasks = input.tasks.filter((task) => task.status === "in_progress");
  const finishedSessions = input.sessions.filter((session) => session.state === "finished");
  const postponeTotal = input.feedCards.reduce((sum, card) => sum + (card.postponeCount ?? 0), 0);

  const ratios = finishedSessions
    .map((session) => {
      const task = input.tasks.find((candidate) => candidate.id === session.taskId);
      const planned = calculatePlannedMinutesForSession(task ?? null);
      const actual = Math.max(1, Math.floor(deriveSessionElapsedSeconds(session) / 60));
      if (planned <= 0) return null;
      return actual / planned;
    })
    .filter((value): value is number => value !== null);
  const avgRatio = ratios.length > 0 ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : null;
  const accuracy = classifyAccuracyRatio(avgRatio);

  const carryForwardValue = todoTasks.length + inProgressTasks.length;
  const carryForward =
    carryForwardValue === 0
      ? {
          label: "Carry-forward load is light",
          detail: "You have room to capture new ideas without overloading your next session."
        }
      : carryForwardValue <= 4
        ? {
            label: "Carry-forward is manageable",
            detail: `${carryForwardValue} open tasks are waiting. Pick one and keep the next move tiny.`
          }
        : {
            label: "Carry-forward is building",
            detail: `${carryForwardValue} open tasks are stacked. A short rebalance can reduce context switching.`
          };

  const postponement =
    postponeTotal === 0
      ? {
          label: "You are not leaning on postpones right now",
          detail: "Great signal for momentum. Keep protecting focus windows."
        }
      : postponeTotal <= 5
        ? {
            label: "Some postponing, still healthy",
            detail: `${postponeTotal} postpones recorded. Consider breaking one delayed card into a smaller next step.`
          }
        : {
            label: "Postponement pattern is rising",
            detail: `${postponeTotal} postpones recorded. A reset on scope may help you regain flow.`
          };

  const topInsight =
    carryForwardValue > 4
      ? "Most friction is coming from carry-forward load, not lack of effort."
      : postponeTotal > 5
        ? "Postpones are signaling scope pressure; shrinking the next step should help."
        : doneTasks.length > 0
          ? "Completion momentum is visible. Protect it with one clearly scoped next action."
          : "Start with one tiny completed session to establish momentum.";

  const recommendation =
    carryForwardValue > 4
      ? "Choose one in-progress task, postpone one non-urgent card, and run a 20-minute session."
      : postponeTotal > 5
        ? "Use 'Break into smaller step' on your next delayed card, then finish that smaller step today."
        : avgRatio !== null && avgRatio >= 1.2
          ? "Trim your next estimate and finish one shorter session before adding new work."
          : "Keep your current rhythm and close one more lightweight loop before context switching.";

  return {
    topInsight,
    estimationAccuracy: accuracy,
    carryForward,
    postponement,
    recommendation
  };
}
export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [activeLens, setActiveLens] = useState<FeedLens>("all");
  const [executionLens, setExecutionLens] = useState<ExecutionLens>("all");
  const [founderMode, setFounderMode] = useState(false);
  const [activeSurface, setActiveSurface] = useState<Surface>("feed");

  const [captureDraft, setCaptureDraft] = useState("");
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [items, setItems] = useState<BrainItemDto[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedContinuity, setSelectedContinuity] = useState<ContinuityContext | null>(null);

  const [commentThreadId, setCommentThreadId] = useState("");
  const [chatThreadId, setChatThreadId] = useState("");
  const [commentMessages, setCommentMessages] = useState<MessageDto[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageDto[]>([]);

  const [artifactHistoryByItem, setArtifactHistoryByItem] = useState<Record<string, { summary: string[]; classification: string[] }>>({});
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDto | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionDto[]>([]);
  const [timeWindow, setTimeWindow] = useState<TimeWindowOption>("4h");
  const [customWindowMinutes, setCustomWindowMinutes] = useState(180);

  const [captureLoading, setCaptureLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [itemContextLoading, setItemContextLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [captureStatusNotice, setCaptureStatusNotice] = useState("");
  const [captureSuccessNotice, setCaptureSuccessNotice] = useState("");
  const [feedError, setFeedError] = useState("");
  const [chatError, setChatError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [chatFallbackNotice, setChatFallbackNotice] = useState("");
  const [conversionNotice, setConversionNotice] = useState("");
  const [itemActionNotice, setItemActionNotice] = useState("");
  const [pendingPlanPreview, setPendingPlanPreview] = useState<PlanPreviewDraft | null>(null);
  const [pendingPostponeSheet, setPendingPostponeSheet] = useState<PostponeDraft | null>(null);
  const [pendingFinishRebalance, setPendingFinishRebalance] = useState<FinishRebalanceDraft | null>(null);
  const [timeActionNotice, setTimeActionNotice] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
  const actionableTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const windowMinutes = useMemo(() => resolveTimeWindowMinutes(timeWindow, customWindowMinutes), [customWindowMinutes, timeWindow]);
  const selectedItemTasks = useMemo(
    () => (selectedItem ? tasks.filter((task) => task.sourceItemId === selectedItem.id) : []),
    [selectedItem, tasks]
  );
  const selectedItemTask = useMemo(
    () => selectedItemTasks.find((task) => task.status !== "done") ?? selectedItemTasks[0] ?? null,
    [selectedItemTasks]
  );
  const selectedTaskSourceItem = useMemo(() => {
    if (!selectedTask?.sourceItemId) return null;
    return items.find((item) => item.id === selectedTask.sourceItemId) ?? null;
  }, [items, selectedTask?.sourceItemId]);
  const selectedArtifacts = useMemo(() => {
    if (!selectedItem) return { summary: [], classification: [] };
    return artifactHistoryByItem[selectedItem.id] ?? { summary: [], classification: [] };
  }, [artifactHistoryByItem, selectedItem]);

  const taskById = useMemo(() => {
    const map = new Map<string, TaskDto>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  const sessionByTaskId = useMemo(() => {
    const map = new Map<string, SessionDto>();
    for (const session of sessionHistory) {
      const existing = map.get(session.taskId);
      if (!existing) {
        map.set(session.taskId, session);
        continue;
      }
      if (session.startedAt > existing.startedAt) {
        map.set(session.taskId, session);
      }
    }
    if (activeSession) {
      const existing = map.get(activeSession.taskId);
      if (!existing || activeSession.startedAt >= existing.startedAt) {
        map.set(activeSession.taskId, activeSession);
      }
    }
    return map;
  }, [activeSession, sessionHistory]);

  const itemById = useMemo(() => {
    const map = new Map<string, BrainItemDto>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const feedModels = useMemo<FeedCardModel[]>(() => {
    return feedCards.map((card) => {
      const linkedTask = card.taskId ? taskById.get(card.taskId) : undefined;
      const linkedSession = linkedTask ? sessionByTaskId.get(linkedTask.id) : undefined;
      const sourceItemId = card.itemId ?? linkedTask?.sourceItemId ?? undefined;
      const linkedItem = sourceItemId ? itemById.get(sourceItemId) : undefined;
      const variant = inferVariant(card, linkedTask, linkedSession);
      return {
        card,
        variant,
        continuity: {
          whyShown: card.whyShown.summary,
          whereLeftOff: inferWhereLeftOff(card, variant, linkedTask, linkedSession, linkedItem),
          changedSince: inferContinuityNote(card, variant, linkedTask, linkedSession),
          blockedState: variant === "blocked" ? inferBlockedState(card, linkedTask, linkedSession) : undefined,
          nextStep: inferNextStep(card, variant, linkedTask, linkedSession, linkedItem),
          lastTouched: formatRelative(linkedItem?.updatedAt ?? linkedTask?.updatedAt ?? linkedSession?.startedAt),
          sourceItemId,
          sourceItemTitle: linkedItem?.title
        }
      };
    });
  }, [feedCards, itemById, sessionByTaskId, taskById]);

  const visibleFeedModels = useMemo(() => {
    if (!founderMode) return feedModels;
    return feedModels.filter((model) => matchesExecutionLens(model.variant, executionLens));
  }, [executionLens, feedModels, founderMode]);

  const founderStats = useMemo(
    () => [
      { label: "Cards in focus", value: String(visibleFeedModels.length) },
      {
        label: "Ready to move",
        value: String(feedModels.filter((model) => model.variant === "execution" || model.variant === "resume").length)
      },
      { label: "Needs unblock", value: String(feedModels.filter((model) => model.variant === "blocked").length) }
    ],
    [feedModels, visibleFeedModels.length]
  );

  const suggestedFocus = useMemo(() => {
    const candidate = visibleFeedModels
      .filter((model) => Boolean(model.continuity.sourceItemId))
      .sort((left, right) => {
        const leftBlocked = left.variant === "blocked" ? 30 : 0;
        const rightBlocked = right.variant === "blocked" ? 30 : 0;
        const leftReady = left.variant === "execution" || left.variant === "resume" ? 18 : 0;
        const rightReady = right.variant === "execution" || right.variant === "resume" ? 18 : 0;
        const leftPostpone = Math.min(left.card.postponeCount ?? 0, 4) * 4;
        const rightPostpone = Math.min(right.card.postponeCount ?? 0, 4) * 4;
        return rightBlocked + rightReady + rightPostpone - (leftBlocked + leftReady + leftPostpone);
      })[0];
    if (!candidate || !candidate.continuity.sourceItemId) return null;
    const reason = candidate.continuity.blockedState
      ? `Blocked: ${candidate.continuity.blockedState}`
      : candidate.continuity.whyShown ?? "Worth revisiting now.";
    return {
      title: candidate.card.title,
      reason,
      nextStep: candidate.continuity.nextStep ?? "Open and leave one continuation note.",
      onOpen: () => {
        setSelectedItemId(candidate.continuity.sourceItemId ?? "");
        setSelectedContinuity(candidate.continuity);
        setActiveSurface("item");
      }
    };
  }, [visibleFeedModels]);

  const founderBlockedItems = useMemo(
    () =>
      visibleFeedModels
        .filter((model) => model.variant === "blocked" && model.continuity.sourceItemId)
        .slice(0, 2)
        .map((model) => ({
          id: model.card.id,
          title: model.card.title,
          reason: model.continuity.blockedState ?? "Blocked signal detected.",
          nextMove: model.continuity.nextStep ?? "Open and leave one unblock note.",
          onOpen: () => {
            setSelectedItemId(model.continuity.sourceItemId ?? "");
            setSelectedContinuity(model.continuity);
            setActiveSurface("item");
          }
        })),
    [visibleFeedModels]
  );

  const founderSummaryText = useMemo(() => {
    if (feedModels.length === 0) {
      return "Capture a few thoughts first. Founder mode will summarize execution signals once your feed has continuity history.";
    }
    const changedSource = items[0];
    const changedSignal = changedSource
      ? `${changedSource.title} touched ${formatRelative(changedSource.updatedAt) ?? "recently"}`
      : "No recent updates yet";
    const doneCount = tasks.filter((task) => task.status === "done").length;
    const blockedModels = feedModels.filter((model) => model.variant === "blocked");
    const readyModels = feedModels.filter((model) => model.variant === "execution" || model.variant === "resume");
    const nextSignal =
      blockedModels[0]?.continuity.nextStep ??
      readyModels[0]?.continuity.nextStep ??
      "Open one item and leave one continuation note.";
    return `Changed: ${changedSignal}. Done: ${doneCount} tasks. Blocked: ${blockedModels.length} cards. Next: ${nextSignal}`;
  }, [feedModels, items, tasks]);

  const resumeSessionCard = useMemo(() => {
    if (!activeSession || activeSession.state === "finished") return null;
    const linkedTask = tasks.find((task) => task.id === activeSession.taskId);
    if (!linkedTask) return null;
    return {
      taskId: linkedTask.id,
      title: linkedTask.title,
      state: activeSession.state
    };
  }, [activeSession, tasks]);

  const timeSuggestedTasks = useMemo(() => {
    const ranked = actionableTasks
      .map((task) => ({
        task,
        minutes: estimateTaskMinutes(task)
      }))
      .sort((left, right) => {
        if (left.task.status !== right.task.status) {
          if (left.task.status === "in_progress") return -1;
          if (right.task.status === "in_progress") return 1;
        }
        if (left.minutes !== right.minutes) return left.minutes - right.minutes;
        return right.task.updatedAt.localeCompare(left.task.updatedAt);
      });

    const picked: Array<{ task: TaskDto; minutes: number }> = [];
    let usedMinutes = 0;
    for (const candidate of ranked) {
      if (picked.length >= 5) break;
      if (candidate.minutes + usedMinutes > windowMinutes && picked.length > 0) continue;
      picked.push(candidate);
      usedMinutes += candidate.minutes;
    }
    return {
      tasks: picked,
      usedMinutes
    };
  }, [actionableTasks, windowMinutes]);

  const timeWindowLabel = timeWindow === "custom" ? `${windowMinutes}m` : timeWindow;

  const selectedItemSession =
    selectedItemTask && activeSession && activeSession.taskId === selectedItemTask.id ? activeSession : null;
  const selectedTaskSession = selectedTask && activeSession && activeSession.taskId === selectedTask.id ? activeSession : null;
  const sessionElapsedSeconds = useMemo(() => deriveSessionElapsedSeconds(selectedTaskSession), [selectedTaskSession]);
  const sessionElapsedLabel = useMemo(() => formatDurationLabel(sessionElapsedSeconds), [sessionElapsedSeconds]);
  const executionSourceContext = useMemo<ActiveTaskContextPeek | null>(() => {
    if (!selectedTaskSourceItem) return null;
    return {
      title: selectedTaskSourceItem.title,
      excerpt: selectedTaskSourceItem.rawContent.slice(0, 180),
      updatedAt: selectedTaskSourceItem.updatedAt
    };
  }, [selectedTaskSourceItem]);
  const latestComment = commentMessages.length > 0 ? commentMessages[commentMessages.length - 1] : null;
  const syntheticDetailCard = useMemo(
    () => buildSyntheticDetailCard(selectedItem, selectedItemTask, selectedContinuity),
    [selectedContinuity, selectedItem, selectedItemTask]
  );
  const syntheticDetailVariant = useMemo(
    () => inferVariant(syntheticDetailCard, selectedItemTask ?? undefined, selectedItemSession ?? undefined),
    [selectedItemSession, selectedItemTask, syntheticDetailCard]
  );
  const derivedItemContinuity = useMemo(
    () => {
      const blockedState =
        selectedContinuity?.blockedState ??
        (syntheticDetailVariant === "blocked"
          ? inferBlockedState(syntheticDetailCard, selectedItemTask ?? undefined, selectedItemSession ?? undefined)
          : undefined);
      return {
        whyShown:
          selectedContinuity?.whyShown ??
          (selectedItem ? "Resurfaced to restore context and keep this thought moving." : undefined),
        lastTouched: selectedContinuity?.lastTouched ?? formatRelative(selectedItem?.updatedAt),
        whereLeftOff:
          latestComment?.content ??
          (blockedState ? `Blocked: ${blockedState}` : selectedContinuity?.changedSince) ??
          "No continuation note yet; add one sentence to preserve re-entry.",
        changedSince:
          selectedContinuity?.changedSince ??
          (latestComment ? `Latest continuation note: ${latestComment.content}` : blockedState ? `Still blocked: ${blockedState}` : "No new updates since the last feed refresh."),
        blockedState,
        nextStep:
          selectedContinuity?.nextStep ??
          inferNextStep(syntheticDetailCard, syntheticDetailVariant, selectedItemTask ?? undefined, selectedItemSession ?? undefined, selectedItem ?? undefined),
        executionHint: summarizeExecutionHint(selectedItemTask, selectedItemSession)
      };
    },
    [latestComment, selectedContinuity, selectedItem, selectedItemSession, selectedItemTask, syntheticDetailCard, syntheticDetailVariant]
  );

  const allSessions = useMemo(() => {
    const byTask = new Map<string, SessionDto>();
    sessionHistory.forEach((session) => {
      const existing = byTask.get(session.taskId);
      if (!existing) {
        byTask.set(session.taskId, session);
        return;
      }
      const existingStartedAt = new Date(existing.startedAt).getTime();
      const candidateStartedAt = new Date(session.startedAt).getTime();
      if (candidateStartedAt > existingStartedAt) {
        byTask.set(session.taskId, session);
      }
    });
    if (activeSession) {
      byTask.set(activeSession.taskId, activeSession);
    }
    return Array.from(byTask.values());
  }, [activeSession, sessionHistory]);

  const meInsights = useMemo(
    () =>
      buildMeInsights({
        tasks,
        sessions: allSessions,
        feedCards
      }),
    [allSessions, feedCards, tasks]
  );

  const reentryMessage = useMemo(() => {
    if (selectedItem) return `Last continuity touchpoint: ${selectedItem.title}.`;
    if (lastAction) return `Last action: ${lastAction}.`;
    return "Everything starts here. Open a card, continue, and return.";
  }, [lastAction, selectedItem]);

  const relatedItemsForDetail = useMemo(() => buildRelatedItems(selectedItem, items), [items, selectedItem]);
  const suggestedPromptsForDetail = useMemo(() => {
    if (!selectedItem) return [];
    return buildSuggestedPrompts(selectedItem, derivedItemContinuity.nextStep);
  }, [derivedItemContinuity.nextStep, selectedItem]);

  useEffect(() => {
    const storedLens = window.localStorage.getItem(storageKeys.activeLens);
    if (
      storedLens === "all" ||
      storedLens === "keep_in_mind" ||
      storedLens === "open_loops" ||
      storedLens === "learning" ||
      storedLens === "in_progress" ||
      storedLens === "recently_commented"
    ) {
      setActiveLens(storedLens);
    }

    const storedExecutionLens = window.localStorage.getItem(storageKeys.executionLens);
    if (storedExecutionLens === "all" || storedExecutionLens === "ready_to_move" || storedExecutionLens === "needs_unblock" || storedExecutionLens === "momentum") {
      setExecutionLens(storedExecutionLens);
    }

    const storedSurface = window.localStorage.getItem(storageKeys.activeSurface);
    if (storedSurface === "feed" || storedSurface === "item" || storedSurface === "session" || storedSurface === "time" || storedSurface === "me") {
      setActiveSurface(storedSurface);
    }

    const storedFounderMode = window.localStorage.getItem(storageKeys.founderMode);
    setFounderMode(storedFounderMode === "1");
    setSelectedItemId(window.localStorage.getItem(storageKeys.selectedItemId) ?? "");
    setSelectedTaskId(window.localStorage.getItem(storageKeys.selectedTaskId) ?? "");
    const storedTimeWindow = window.localStorage.getItem(storageKeys.timeWindow);
    if (storedTimeWindow === "2h" || storedTimeWindow === "4h" || storedTimeWindow === "6h" || storedTimeWindow === "8h" || storedTimeWindow === "24h" || storedTimeWindow === "custom") {
      setTimeWindow(storedTimeWindow);
    }
    const storedCustomWindowMinutes = Number.parseInt(window.localStorage.getItem(storageKeys.customWindowMinutes) ?? "", 10);
    if (!Number.isNaN(storedCustomWindowMinutes)) {
      setCustomWindowMinutes(Math.max(30, Math.min(1440, storedCustomWindowMinutes)));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.activeLens, activeLens);
  }, [activeLens, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.executionLens, executionLens);
  }, [executionLens, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.activeSurface, activeSurface);
  }, [activeSurface, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.founderMode, founderMode ? "1" : "0");
  }, [founderMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.timeWindow, timeWindow);
  }, [hydrated, timeWindow]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.customWindowMinutes, String(customWindowMinutes));
  }, [customWindowMinutes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedItemId) {
      window.localStorage.removeItem(storageKeys.selectedItemId);
      return;
    }
    window.localStorage.setItem(storageKeys.selectedItemId, selectedItemId);
  }, [hydrated, selectedItemId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedTaskId) {
      window.localStorage.removeItem(storageKeys.selectedTaskId);
      return;
    }
    window.localStorage.setItem(storageKeys.selectedTaskId, selectedTaskId);
  }, [hydrated, selectedTaskId]);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      const preferredLens = await loadUserPreferences();
      const lensForInitialLoad = preferredLens ?? activeLens;
      await Promise.all([loadItems(), loadFeed(lensForInitialLoad), loadTasks(), loadAllSessionsForUser()]);
    })();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void loadFeed(activeLens);
  }, [activeLens, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedItemId) {
      setCommentThreadId("");
      setChatThreadId("");
      setCommentMessages([]);
      setChatMessages([]);
      return;
    }
    void loadSelectedItemContext(selectedItemId);
  }, [hydrated, selectedItemId]);

  useEffect(() => {
    if (!hydrated || !selectedTaskId) {
      setActiveSession(null);
      return;
    }
    void loadSessionsForTask(selectedTaskId);
  }, [hydrated, selectedTaskId]);

  async function loadFeed(lens: FeedLens) {
    setFeedLoading(true);
    try {
      const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: 10 });
      setFeedCards(cards);
      setFeedError("");
    } catch {
      setFeedError("Focus needs a moment. Your memory is safe—try again shortly.");
      setFeedCards([]);
    } finally {
      setFeedLoading(false);
    }
  }

  async function loadItems() {
    try {
      const response = await apiClient<BrainItemDto[]>(`${endpoints.brainItems}?userId=${encodeURIComponent(userId)}`);
      const nextItems = [...response].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setItems(nextItems);
      setCaptureError("");
      if (nextItems.length === 0) {
        setSelectedItemId("");
        return;
      }
      if (!nextItems.some((item) => item.id === selectedItemId)) {
        setSelectedItemId(nextItems[0].id);
      }
    } catch {
      setCaptureError("Could not load captured items.");
    }
  }

  async function loadTasks() {
    setTasksLoading(true);
    try {
      const response = await apiClient<TaskDto[]>(`${endpoints.tasks}?userId=${encodeURIComponent(userId)}`);
      const nextTasks = [...response].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setTasks(nextTasks);
      setTaskError("");
      if (nextTasks.length === 0) {
        setSelectedTaskId("");
        return;
      }
      if (!nextTasks.some((task) => task.id === selectedTaskId)) {
        setSelectedTaskId(nextTasks[0].id);
      }

      if (!activeSession || !nextTasks.some((task) => task.id === activeSession.taskId)) {
        const inProgressTask = nextTasks.find((task) => task.status === "in_progress");
        if (inProgressTask) {
          const sessions = await listSessions<SessionDto[]>({ taskId: inProgressTask.id });
          const session = sessions.find((candidate) => candidate.state === "running" || candidate.state === "paused") ?? null;
          setActiveSession(session);
        } else {
          setActiveSession(null);
        }
      }
    } catch {
      setTaskError("Could not load execution tasks.");
    } finally {
      setTasksLoading(false);
    }
  }

  async function loadSessionsForTask(taskId: string) {
    try {
      const sessions = await listSessions<SessionDto[]>({ taskId });
      setActiveSession(selectActiveSession(sessions));
    } catch {
      setTaskError("Could not load sessions for this task.");
      setActiveSession(null);
    }
  }

  async function loadAllSessionsForUser() {
    try {
      const sessions = await listSessions<SessionDto[]>({ userId });
      setSessionHistory(
        [...sessions].sort((left, right) => {
          if (left.startedAt !== right.startedAt) {
            return right.startedAt.localeCompare(left.startedAt);
          }
          return right.id.localeCompare(left.id);
        })
      );
    } catch {
      // Insights are supportive-only and should not block the core loop.
      setSessionHistory([]);
    }
  }

  async function refreshTaskAndSessionSignals() {
    await Promise.all([loadTasks(), loadAllSessionsForUser()]);
  }

  async function refreshExecutionData() {
    await Promise.all([loadTasks(), loadAllSessionsForUser()]);
  }

  async function loadUserPreferences() {
    try {
      const preferences = await getUserPreference<UserPreferenceDto>(userId);
      setActiveLens(preferences.defaultLens);
      setFounderMode(preferences.founderMode);
      return preferences.defaultLens;
    } catch {
      return null;
    }
  }

  async function persistUserPreferences(updates: Partial<Pick<UserPreferenceDto, "defaultLens" | "founderMode">>) {
    try {
      await updateUserPreference<UserPreferenceDto>(userId, updates);
    } catch {
      // Preference persistence should not block core loop actions.
    }
  }

  function handleLensChange(nextLens: FeedLens) {
    setActiveLens(nextLens);
    if (hydrated) {
      void persistUserPreferences({ defaultLens: nextLens });
    }
  }

  function handleFounderModeToggle(enabled: boolean) {
    setFounderMode(enabled);
    if (hydrated) {
      void persistUserPreferences({ founderMode: enabled });
    }
  }

  function syncItemArtifacts(itemId: string, artifacts: ItemArtifactDto[]) {
    const summary = artifacts.filter((artifact) => artifact.type === "summary").map((artifact) => deriveArtifactText(artifact.payload));
    const classification = artifacts.filter((artifact) => artifact.type === "classification").map((artifact) => deriveArtifactText(artifact.payload));
    setArtifactHistoryByItem((current) => ({
      ...current,
      [itemId]: { summary, classification }
    }));
  }

  async function loadSelectedItemContext(itemId: string) {
    setItemContextLoading(true);
    setItemActionNotice("");
    try {
      const [threads, artifacts] = await Promise.all([listThreadsByTarget<ThreadDto[]>(itemId), listBrainItemArtifacts<ItemArtifactDto[]>(itemId)]);
      const commentThread = threads.find((thread) => thread.kind === "item_comment") ?? null;
      const chatThread = threads.find((thread) => thread.kind === "item_chat") ?? null;
      setCommentThreadId(commentThread?.id ?? "");
      setChatThreadId(chatThread?.id ?? "");

      if (commentThread) {
        const comments = await listThreadMessages<MessageDto[]>(commentThread.id);
        setCommentMessages(comments.filter((message) => message.role === "user"));
      } else {
        setCommentMessages([]);
      }

      if (chatThread) {
        const messages = await listThreadMessages<MessageDto[]>(chatThread.id);
        setChatMessages(messages);
      } else {
        setChatMessages([]);
      }

      syncItemArtifacts(itemId, artifacts);
      setChatError("");
    } catch {
      setChatError("Could not load continuity context for this item.");
      setCommentMessages([]);
      setChatMessages([]);
    } finally {
      setItemContextLoading(false);
    }
  }

  async function ensureThreadForItem(itemId: string, kind: "item_comment" | "item_chat") {
    if (kind === "item_comment" && itemId === selectedItemId && commentThreadId) return commentThreadId;
    if (kind === "item_chat" && itemId === selectedItemId && chatThreadId) return chatThreadId;

    const threads = await listThreadsByTarget<ThreadDto[]>(itemId);
    const existing = threads.find((thread) => thread.kind === kind);
    if (existing) {
      if (itemId === selectedItemId) {
        if (kind === "item_comment") setCommentThreadId(existing.id);
        if (kind === "item_chat") setChatThreadId(existing.id);
      }
      return existing.id;
    }

    const created = await createThread<{ id: string }>({ targetItemId: itemId, kind });
    if (itemId === selectedItemId) {
      if (kind === "item_comment") setCommentThreadId(created.id);
      if (kind === "item_chat") setChatThreadId(created.id);
    }
    return created.id;
  }

  async function createComment(itemId: string, content: string) {
    const normalized = content.trim();
    if (!normalized) return null;
    const threadId = await ensureThreadForItem(itemId, "item_comment");
    const created = await sendMessage<MessageDto>({ threadId, role: "user", content: normalized });
    if (itemId === selectedItemId) {
      setCommentMessages((current) => [...current, created]);
      setItemActionNotice("Comment added to continuity timeline.");
    }
    return created;
  }

  async function captureItem(intent: CaptureSubmitIntent = "save") {
    const normalized = captureDraft.trim();
    if (!normalized) return;
    setCaptureLoading(true);
    setCaptureError("");
    setCaptureStatusNotice("");
    const normalizedTitle = normalized.replace(/\s+/g, " ").slice(0, 80);
    const title = normalizedTitle.length > 0 ? normalizedTitle : "Captured note";

    try {
      const created = await createBrainItem<BrainItemDto>({ userId, type: "note", title, rawContent: normalized });
      setCaptureDraft("");
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedItemId(created.id);
      setLastAction("Captured a new note.");
      await Promise.all([loadFeed(activeLens), loadTasks()]);

      if (intent === "save_and_plan") {
        const plannedTask = await runConvert({ itemId: created.id, content: created.rawContent });
        if (plannedTask) {
          setSelectedTaskId(plannedTask.id);
          setActiveSurface("session");
        } else {
          setCaptureStatusNotice("Plan preview is currently lightweight. Review conversion guidance and continue from feed.");
        }
      }

      if (intent === "save_and_remind") {
        setCaptureStatusNotice("Remind Later flow is currently a stub. Your capture is saved and can be snoozed from the feed.");
      }

      const successMessage = captureSuccessMessages[intent];
      setCaptureSuccessNotice(successMessage);
      window.setTimeout(() => {
        setCaptureSheetOpen(false);
        setCaptureSuccessNotice("");
      }, 750);
    } catch {
      setCaptureError("Capture failed. Retry.");
    } finally {
      setCaptureLoading(false);
    }
  }

  function openCaptureSheet() {
    setCaptureError("");
    setCaptureStatusNotice("");
    setCaptureSuccessNotice("");
    setCaptureSheetOpen(true);
  }

  function handleVoiceCaptureStub() {
    setCaptureStatusNotice("Voice capture is a placeholder for now. Type your thought and save.");
  }

  async function runConvert(input: { itemId: string; content: string; sourceMessageId?: string }): Promise<TaskDto | null> {
    setConversionNotice("");
    setTaskError("");
    try {
      const result = await convertToTask<ConvertResponse>({
        userId,
        sourceItemId: input.itemId,
        sourceMessageId: input.sourceMessageId ?? null,
        content: input.content
      });
      if (result.outcome === "task_created") {
        setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)]);
        setSelectedTaskId(result.task.id);
        setConversionNotice(`Task created: ${result.task.title}`);
        await Promise.all([loadTasks(), loadAllSessionsForUser()]);
        return result.task;
      } else if (result.outcome === "plan_suggested") {
        openPlanPreview({
          sourceItemId: result.sourceItemId ?? input.itemId,
          title: result.title,
          steps: result.steps,
          confidence: result.confidence
        });
        setConversionNotice(`Plan preview ready (${result.steps.length} steps).`);
      } else {
        setConversionNotice(`Conversion skipped: ${result.reason}`);
      }
      await Promise.all([loadTasks(), loadAllSessionsForUser()]);
      return null;
    } catch {
      setTaskError("Could not convert into execution step.");
      return null;
    }
  }

  async function createManualTaskFromFeedCard(card: FeedCardDto): Promise<TaskDto> {
    const fallbackTitle = card.title.trim().slice(0, 200) || "Follow up on resurfaced memory";
    const created = await createTask<TaskDto>({
      userId,
      title: fallbackTitle,
      sourceItemId: card.itemId
    });
    setTasks((current) => [created, ...current.filter((task) => task.id !== created.id)]);
    setSelectedTaskId(created.id);
    setConversionNotice(`Task created: ${created.title}`);
    await Promise.all([loadTasks(), loadAllSessionsForUser()]);
    return created;
  }

  async function startSessionFromFeedCard(card: FeedCardDto) {
    if (!card.itemId) return;

    setTaskError("");
    setSelectedItemId(card.itemId);

    const existingTask = tasks.find((task) => task.sourceItemId === card.itemId && task.status !== "done");
    const convertedTask =
      existingTask ??
      (await runConvert({
        itemId: card.itemId,
        content: card.body
      }));

    let taskToStart = convertedTask;
    if (!taskToStart) {
      try {
        taskToStart = await createManualTaskFromFeedCard(card);
      } catch {
        setTaskError("Could not start a session from this card yet.");
        return;
      }
    }

    try {
      const session = await startTaskSession<SessionDto>(taskToStart.id);
      setActiveSession(session);
      setSelectedTaskId(taskToStart.id);
      setConversionNotice(`Session started: ${taskToStart.title}`);
      setActiveSurface("session");
      await Promise.all([loadTasks(), loadSessionsForTask(taskToStart.id), loadAllSessionsForUser()]);
    } catch {
      setTaskError("Could not start a session right now.");
    }
  }

  async function runQuickAction(action: "summarize" | "classify" | "convert_to_task") {
    if (!selectedItem) return;
    setLastAction(action);
    if (action === "convert_to_task") {
      await runConvert({ itemId: selectedItem.id, content: selectedItem.rawContent });
      return;
    }

    try {
      if (action === "summarize") {
        const response = await summarizeBrainItem<{ ai: { content: string } }>({ itemId: selectedItem.id, rawContent: selectedItem.rawContent });
        setArtifactHistoryByItem((current) => {
          const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
          return {
            ...current,
            [selectedItem.id]: { summary: [response.ai.content, ...existing.summary], classification: existing.classification }
          };
        });
      } else {
        const response = await classifyBrainItem<{ ai: { content: string } }>({ itemId: selectedItem.id, rawContent: selectedItem.rawContent });
        setArtifactHistoryByItem((current) => {
          const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
          return {
            ...current,
            [selectedItem.id]: { summary: existing.summary, classification: [response.ai.content, ...existing.classification] }
          };
        });
      }
    } catch {
      setLastAction(`${action}_failed`);
    }
  }

  async function runAiQuery(question: string) {
    if (!selectedItem) return;
    setLastQuestion(question);
    setChatError("");
    try {
      const activeThreadId = await ensureThreadForItem(selectedItem.id, "item_chat");
      const response = await queryBrainItemThread<{ userMessage: MessageDto; message: MessageDto; fallbackUsed: boolean }>({
        threadId: activeThreadId,
        question
      });
      setChatMessages((current) => [...current, response.userMessage, response.message]);
      setChatFallbackNotice(response.fallbackUsed ? "AI fallback used for this response." : "");
      setItemActionNotice("Asked Yurbrain in-context.");
    } catch {
      setChatError("Could not reach AI query. Retry your last question.");
      setChatFallbackNotice("AI query unavailable; using local echo fallback.");
      setChatMessages((current) => [
        ...current,
        { id: `local-user-${Date.now()}`, threadId: chatThreadId, role: "user", content: question, createdAt: new Date().toISOString() },
        {
          id: `local-assistant-${Date.now()}`,
          threadId: chatThreadId,
          role: "assistant",
          content: `Recommendation: ${derivedItemContinuity.nextStep ?? "Open this item and continue it now."} Reason: ${
            derivedItemContinuity.blockedState
              ? `It is currently blocked (${derivedItemContinuity.blockedState}).`
              : "It is the clearest active continuity loop."
          } Next move: ${derivedItemContinuity.nextStep ?? "Write one continuation note, then return to feed."}`,
          createdAt: new Date().toISOString()
        }
      ]);
      setItemActionNotice("Used local ask fallback.");
    }
  }

  function handleOpenRelatedItem(itemId: string) {
    if (!itemId) return;
    setSelectedItemId(itemId);
    setSelectedContinuity(null);
    setItemActionNotice("Opened a related item to continue context.");
  }

  function handleKeepInMind() {
    setItemActionNotice("Marked as keep in mind. You can switch to that lens in feed anytime.");
  }

  function openPlanPreview(input: { sourceItemId: string; title: string; steps: string[]; confidence: number }) {
    const normalizedSteps = input.steps
      .map((step, index) => ({
        id: `${Date.now()}-${index}`,
        title: step.trim(),
        minutes: normalizePlanStepMinutes(index)
      }))
      .filter((step) => step.title.length > 0);
    if (normalizedSteps.length === 0) return;

    setPendingPlanPreview({
      sourceItemId: input.sourceItemId,
      title: input.title,
      steps: normalizedSteps,
      confidence: input.confidence
    });
  }

  function updatePlanStepMinutes(stepId: string, minutes: number) {
    setPendingPlanPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        steps: current.steps.map((step) =>
          step.id === stepId ? { ...step, minutes: Math.max(5, Math.min(120, Math.trunc(minutes || 0))) } : step
        )
      };
    });
  }

  async function acceptPlanPreview(startFirstStep: boolean) {
    if (!pendingPlanPreview) return;
    setTaskError("");
    setTasksLoading(true);

    try {
      const createdTasks: TaskDto[] = [];
      for (const step of pendingPlanPreview.steps) {
        const created = await createTask<TaskDto>({
          userId,
          title: step.title,
          sourceItemId: pendingPlanPreview.sourceItemId
        });
        createdTasks.push(created);
      }

      setTasks((current) => {
        const deduped = current.filter((task) => !createdTasks.some((created) => created.id === task.id));
        return [...createdTasks, ...deduped];
      });
      setPendingPlanPreview(null);

      if (createdTasks.length > 0) {
        setSelectedTaskId(createdTasks[0].id);
      }

      if (startFirstStep && createdTasks.length > 0) {
        const session = await startTaskSession<SessionDto>(createdTasks[0].id);
        setActiveSession(session);
        setActiveSurface("session");
        setConversionNotice(`Plan accepted (${createdTasks.length} tasks). Started first step.`);
        await Promise.all([loadSessionsForTask(createdTasks[0].id), loadAllSessionsForUser()]);
      } else {
        setConversionNotice(`Plan accepted (${createdTasks.length} tasks). Continue from feed when ready.`);
      }

      await Promise.all([loadTasks(), loadAllSessionsForUser()]);
    } catch {
      setTaskError("Could not accept this plan right now.");
    } finally {
      setTasksLoading(false);
    }
  }

  async function startPlanFirstStep() {
    await acceptPlanPreview(true);
  }

  async function handleFinishAction(action: "continue_plan" | "rebalance_day" | "take_break" | "schedule_rest_later") {
    if (!pendingFinishRebalance) return;
    setPendingFinishRebalance(null);
    if (action === "continue_plan") {
      setLastAction("Finished session and continued plan.");
      setConversionNotice("Nice close. Continue your next planned step when ready.");
      setActiveSurface("session");
      return;
    }
    if (action === "rebalance_day") {
      setLastAction("Finished session and rebalanced day.");
      setTimeActionNotice("Rebalanced suggestion: pick one task that fits your remaining window.");
      setActiveSurface("time");
      return;
    }
    if (action === "take_break") {
      setLastAction("Finished session and took a break.");
      setConversionNotice("Break acknowledged. Return to the feed when you're ready.");
      setActiveSurface("feed");
      return;
    }
    setLastAction("Finished session and scheduled rest later.");
    setConversionNotice("Rest reminder captured. Keep the next step lightweight.");
    setActiveSurface("feed");
  }

  function openItemFromModel(model: FeedCardModel) {
    const itemId = model.continuity.sourceItemId ?? model.card.itemId;
    if (!itemId) return;
    setSelectedItemId(itemId);
    setSelectedContinuity(model.continuity);
    setActiveSurface("item");
  }

  function openTaskFromCard(taskId: string) {
    setSelectedTaskId(taskId);
    setActiveSurface("session");
  }

  async function startTimeTask(taskId: string) {
    try {
      setTaskError("");
      const session = await startTaskSession<SessionDto>(taskId);
      setActiveSession(session);
      setSelectedTaskId(taskId);
      setTimeActionNotice("Session started from time window.");
      setActiveSurface("session");
      await Promise.all([loadTasks(), loadSessionsForTask(taskId), loadAllSessionsForUser()]);
    } catch {
      setTaskError("Could not start this task from time planning.");
    }
  }

  async function startWithoutPlanning() {
    const candidate = tasks.find((task) => task.status === "todo") ?? tasks.find((task) => task.status === "in_progress") ?? null;
    if (!candidate) {
      setTimeActionNotice("No task is available yet. Capture something first.");
      return;
    }
    await startTimeTask(candidate.id);
  }

  function openPostponeSheet(card: FeedCardDto) {
    setPendingPostponeSheet({
      cardId: card.id,
      title: card.title,
      itemId: card.itemId ?? null,
      postponeCount: card.postponeCount ?? 0
    });
  }

  async function applyPostponeMinutes(minutes: number, notice: string) {
    if (!pendingPostponeSheet) return;
    try {
      await snoozeFeedCard<{ ok: boolean }>(pendingPostponeSheet.cardId, minutes);
      await loadFeed(activeLens);
      setPendingPostponeSheet(null);
      setConversionNotice(notice);
      setTaskError("");
    } catch {
      setTaskError("Could not postpone this card right now.");
    }
  }

  async function applyCustomPostpone(isoDateTime: string) {
    const targetMs = new Date(isoDateTime).getTime();
    if (!Number.isFinite(targetMs) || targetMs <= Date.now()) {
      setTaskError("Choose a future time to reschedule.");
      return;
    }
    const minutes = Math.max(5, Math.min(Math.ceil((targetMs - Date.now()) / 60_000), 60 * 24 * 7));
    await applyPostponeMinutes(minutes, "Scheduled for a specific return slot.");
  }

  async function breakIntoSmallerStep() {
    if (!pendingPostponeSheet) return;
    setTasksLoading(true);
    setTaskError("");
    try {
      const sourceItemId = pendingPostponeSheet.itemId;
      const baseTitle = pendingPostponeSheet.title.trim() || "resurfaced idea";
      const title = `Small step: ${baseTitle}`.slice(0, 200);
      const created = await createTask<TaskDto>({ userId, title, sourceItemId });
      await snoozeFeedCard<{ ok: boolean }>(pendingPostponeSheet.cardId, 240);
      setTasks((current) => [created, ...current.filter((task) => task.id !== created.id)]);
      setSelectedTaskId(created.id);
      setPendingPostponeSheet(null);
      setConversionNotice("Created a smaller step and postponed the original card.");
      setActiveSurface("session");
      await Promise.all([loadTasks(), loadFeed(activeLens), loadAllSessionsForUser()]);
    } catch {
      setTaskError("Could not split this into a smaller step yet.");
    } finally {
      setTasksLoading(false);
    }
  }

  const timelineEntries = useMemo(() => {
    const merged = [
      ...commentMessages.map((message) => ({
        id: message.id,
        role: "user" as const,
        content: message.content,
        createdAt: message.createdAt
      })),
      ...chatMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt
      }))
    ];

    merged.sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.createdAt.localeCompare(right.createdAt);
    });

    return merged.map((entry) => ({
      id: entry.id,
      label: entry.content,
      role: entry.role,
      timestamp: formatRelative(entry.createdAt)
    }));
  }, [chatMessages, commentMessages]);

  const chatLines = useMemo(
    () =>
      chatMessages.map((message) => {
        if (message.role === "assistant") return `AI: ${message.content}`;
        if (message.role === "system") return `System: ${message.content}`;
        return `You: ${message.content}`;
      }),
    [chatMessages]
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: "48px" }}>
      {activeSurface === "feed" ? (
        <FocusFeedScreen
        title="Focus Feed"
        subtitle="Recognition first. Continue one thought at a time."
        reentryMessage={reentryMessage}
        activeLens={activeLens}
        lenses={["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"]}
        onLensChange={handleLensChange}
        loading={feedLoading}
        errorMessage={feedError}
        onRetry={() => void loadFeed(activeLens)}
        onReload={() => void loadFeed(activeLens)}
        hasCards={visibleFeedModels.length > 0}
        founderToggle={<FounderModeToggle enabled={founderMode} onToggle={handleFounderModeToggle} />}
        executionLens={founderMode ? <ExecutionLensBar activeLens={executionLens} onChange={setExecutionLens} /> : undefined}
        captureComposer={
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Capture</h2>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setActiveSurface("time")}>
                  Open Time home
                </button>
                <button type="button" onClick={() => setActiveSurface("me")}>
                  Open Me
                </button>
                <button type="button" onClick={openCaptureSheet}>
                  Open capture sheet
                </button>
              </div>
            </div>
            <p style={{ margin: 0, color: "#475569" }}>Capture first, then choose Save, Save + Plan, or Save + Remind Later.</p>
            {captureLoading ? <p style={{ margin: 0 }}>Saving capture...</p> : null}
            {captureStatusNotice ? <p style={{ margin: 0 }}>{captureStatusNotice}</p> : null}
            <CaptureComposer
              isOpen={captureSheetOpen}
              value={captureDraft}
              onChange={setCaptureDraft}
              onSubmit={(intent) => {
                void captureItem(intent);
              }}
              onClose={() => {
                if (captureLoading) return;
                setCaptureSheetOpen(false);
                setCaptureError("");
                setCaptureSuccessNotice("");
              }}
              isSubmitting={captureLoading}
              errorMessage={captureError}
              statusMessage={captureStatusNotice}
              successMessage={captureSuccessNotice}
              onVoiceStub={handleVoiceCaptureStub}
            />
          </div>
        }
        founderSummary={
          founderMode ? (
            <FounderSummarySurface stats={founderStats} suggestedFocus={suggestedFocus} blockedItems={founderBlockedItems} summary={founderSummaryText} />
          ) : undefined
        }
        feedContent={visibleFeedModels.map((model) => (
            <FeedCard
              key={model.card.id}
              variant={model.variant}
              badge={activeLens.replaceAll("_", " ")}
              cardType={model.card.cardType}
              lens={model.card.lens}
              title={model.card.title}
              body={model.card.body}
              createdAt={model.card.createdAt}
              lastRefreshedAt={model.card.lastRefreshedAt}
              whyShown={model.card.whyShown}
              lastTouched={model.continuity.lastTouched}
              whereLeftOff={model.continuity.whereLeftOff}
              continuityNote={model.continuity.changedSince}
              nextStep={model.continuity.nextStep}
              availableActions={model.card.availableActions}
              primaryActionLabel={inferPrimaryActionLabel(model.card, Boolean(model.continuity.sourceItemId))}
              onOpen={
                model.continuity.sourceItemId
                  ? () => openItemFromModel(model)
                  : model.card.taskId
                    ? () => openTaskFromCard(model.card.taskId ?? "")
                    : undefined
              }
              onConvertToTask={
                model.card.itemId
                  ? () =>
                      void (async () => {
                        const createdTask = await runConvert({ itemId: model.card.itemId ?? "", content: model.card.body });
                        if (createdTask) {
                          setActiveSurface("session");
                        }
                      })()
                  : undefined
              }
              onStartSession={
                model.card.itemId && supportsAction(model.card, "start_session")
                  ? () => {
                      void startSessionFromFeedCard(model.card);
                    }
                  : undefined
              }
              onDismiss={() =>
                void (async () => {
                  await dismissFeedCard<{ ok: boolean }>(model.card.id);
                  await loadFeed(activeLens);
                })()
              }
              onSnooze={() => openPostponeSheet(model.card)}
              onRefresh={() =>
                void (async () => {
                  await refreshFeedCard<{ ok: boolean }>(model.card.id);
                  await loadFeed(activeLens);
                })()
              }
            />
          ))}
        />
      ) : null}

      {activeSurface === "feed" && (conversionNotice || taskError || tasksLoading) ? (
        <section
          style={{
            margin: "0 auto",
            maxWidth: "960px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: "16px",
            display: "grid",
            gap: "8px"
          }}
        >
          {tasksLoading ? <p style={{ margin: 0 }}>Loading task context...</p> : null}
          {conversionNotice ? <p style={{ margin: 0 }}>{conversionNotice}</p> : null}
          {taskError ? <p style={{ margin: 0 }}>{taskError}</p> : null}
        </section>
      ) : null}

      {pendingPlanPreview ? (
        <PlanPreviewSheet
          isOpen
          title={pendingPlanPreview.title}
          steps={pendingPlanPreview.steps}
          isSubmitting={tasksLoading}
          errorMessage={taskError}
          onClose={() => setPendingPlanPreview(null)}
          onUpdateStepMinutes={(stepId, minutes) => updatePlanStepMinutes(stepId, minutes)}
          onAcceptPlan={() => {
            void acceptPlanPreview(false);
          }}
          onStartFirstStep={() => {
            void startPlanFirstStep();
          }}
        />
      ) : null}

      {pendingPostponeSheet ? (
        <PostponeRescheduleSheet
          isOpen
          title={pendingPostponeSheet.title}
          postponeCount={pendingPostponeSheet.postponeCount}
          isSubmitting={tasksLoading}
          onClose={() => setPendingPostponeSheet(null)}
          onLaterToday={() => {
            void applyPostponeMinutes(180, "Postponed for later today.");
          }}
          onTomorrow={() => {
            void applyPostponeMinutes(24 * 60, "Postponed for tomorrow.");
          }}
          onSuggestSlot={() => {
            const suggestedMinutes = Math.min(12 * 60, 3 * 60 + pendingPostponeSheet.postponeCount * 60);
            void applyPostponeMinutes(suggestedMinutes, `Scheduled in about ${Math.round(suggestedMinutes / 60)}h.`);
          }}
          onBreakIntoSmallerStep={() => {
            void breakIntoSmallerStep();
          }}
          onApplyCustomDateTime={(isoDateTime) => {
            void applyCustomPostpone(isoDateTime);
          }}
        />
      ) : null}

      {activeSurface === "time" ? (
        <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
          <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Time home</h2>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>Choose a horizon, then start one task that fits.</p>
              </div>
              <button type="button" onClick={() => setActiveSurface("feed")}>
                Back to Focus Feed
              </button>
            </div>

            <TimeWindowSelector
              activeWindow={timeWindow}
              customMinutes={customWindowMinutes}
              onWindowChange={setTimeWindow}
              onCustomMinutesChange={setCustomWindowMinutes}
              disabled={tasksLoading}
            />

            <div style={{ borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
              <p style={{ margin: 0 }}>
                <strong>Window:</strong> {timeWindowLabel} ({windowMinutes} minutes)
              </p>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>
                Suggested tasks are deterministic and based on task title length plus status.
              </p>
            </div>

            {resumeSessionCard ? (
              <div style={{ borderRadius: "14px", border: "1px solid #bfdbfe", background: "#eff6ff", padding: "12px", display: "grid", gap: "8px" }}>
                <p style={{ margin: 0 }}>
                  <strong>Resume in progress:</strong> {resumeSessionCard.title}
                </p>
                <p style={{ margin: 0, color: "#334155" }}>
                  {resumeSessionCard.state === "running" ? "Session is running now." : "Session is paused and ready to resume."}
                </p>
                <div>
                  <button type="button" onClick={() => void startTimeTask(resumeSessionCard.taskId)} disabled={tasksLoading}>
                    Resume task
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Tasks that fit {timeWindowLabel}</h3>
              {timeSuggestedTasks.tasks.length === 0 ? (
                <p style={{ margin: 0, color: "#475569" }}>No queued tasks fit yet. Capture or convert one item, then return here.</p>
              ) : (
                timeSuggestedTasks.tasks.map((entry) => (
                  <div
                    key={entry.task.id}
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      padding: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap"
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{entry.task.title}</p>
                      <p style={{ margin: "4px 0 0", color: "#475569" }}>
                        Estimated {entry.minutes} minutes · status {entry.task.status}
                      </p>
                    </div>
                    <button type="button" onClick={() => void startTimeTask(entry.task.id)} disabled={tasksLoading}>
                      Start
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void startWithoutPlanning()}
                disabled={tasksLoading}
                style={{ background: "#0f172a", color: "#ffffff", border: "1px solid #0f172a", borderRadius: "10px", padding: "8px 12px" }}
              >
                Start without planning
              </button>
            </div>
            {timeActionNotice ? <p style={{ margin: 0 }}>{timeActionNotice}</p> : null}
            {taskError ? <p style={{ margin: 0 }}>{taskError}</p> : null}
          </div>
        </section>
      ) : null}

      {activeSurface === "me" ? (
        <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
          <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Me</h2>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>Supportive reflection from your recent flow.</p>
              </div>
              <button type="button" onClick={() => setActiveSurface("feed")}>
                Back to Focus Feed
              </button>
            </div>

            <div style={{ borderRadius: "14px", border: "1px solid #bfdbfe", background: "#eff6ff", padding: "12px" }}>
              <p style={{ margin: 0, color: "#1e3a8a" }}>
                <strong>Top insight:</strong> {meInsights.topInsight}
              </p>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <article style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Estimation accuracy</p>
                <p style={{ margin: "4px 0 0", color: "#334155" }}>{meInsights.estimationAccuracy.label}</p>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>{meInsights.estimationAccuracy.detail}</p>
              </article>
              <article style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Carry-forward pattern</p>
                <p style={{ margin: "4px 0 0", color: "#334155" }}>{meInsights.carryForward.label}</p>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>{meInsights.carryForward.detail}</p>
              </article>
              <article style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Postponement pattern</p>
                <p style={{ margin: "4px 0 0", color: "#334155" }}>{meInsights.postponement.label}</p>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>{meInsights.postponement.detail}</p>
              </article>
            </div>

            <div style={{ borderRadius: "14px", border: "1px solid #d1fae5", background: "#ecfdf5", padding: "12px" }}>
              <p style={{ margin: 0, color: "#065f46" }}>
                <strong>Recommendation:</strong> {meInsights.recommendation}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {activeSurface === "item" ? (
        <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px" }}>
          {selectedItem ? (
            <ItemDetailScreen
              item={{ title: selectedItem.title, rawContent: selectedItem.rawContent }}
              whyShown={derivedItemContinuity.whyShown}
              whereLeftOff={derivedItemContinuity.whereLeftOff}
              changedSince={derivedItemContinuity.changedSince}
              blockedState={derivedItemContinuity.blockedState}
              nextStep={derivedItemContinuity.nextStep}
              lastTouched={derivedItemContinuity.lastTouched}
              executionHint={derivedItemContinuity.executionHint}
              summary={selectedArtifacts.summary[0]}
              classification={selectedArtifacts.classification[0]}
              timeline={timelineEntries}
              loading={itemContextLoading}
              errorMessage={chatError}
              actionNotice={itemActionNotice}
              suggestedPrompts={suggestedPromptsForDetail}
              relatedItems={relatedItemsForDetail}
              onBackToFeed={() => setActiveSurface("feed")}
              onQuickAction={(action) => void runQuickAction(action)}
              onAddComment={(comment) => {
                void createComment(selectedItem.id, comment);
              }}
              onConvertCommentToTask={(comment) => {
                void (async () => {
                  const created = await createComment(selectedItem.id, comment);
                  if (!created) return;
                  await runConvert({ itemId: selectedItem.id, content: created.content, sourceMessageId: created.id });
                  setActiveSurface("session");
                })();
              }}
              onAskYurbrain={(question) => {
                void runAiQuery(question);
              }}
              onOpenRelatedItem={handleOpenRelatedItem}
              onKeepInMind={handleKeepInMind}
              chatPanel={
                <ItemChatPanel
                  onSend={(question) => void runAiQuery(question)}
                  messages={chatLines}
                  mode="ai_query"
                  fallbackNotice={chatFallbackNotice}
                  errorMessage={chatError}
                  onRetry={lastQuestion ? () => void runAiQuery(lastQuestion) : undefined}
                  hideComposer
                />
              }
              artifactHistory={
                <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", padding: "16px", background: "#f8fafc" }}>
                  <h3 style={{ marginTop: 0 }}>AI continuity artifacts</h3>
                  <p style={{ marginBottom: "6px" }}>Summary artifacts: {selectedArtifacts.summary.length}</p>
                  <ul style={{ marginTop: 0 }}>
                    {selectedArtifacts.summary.slice(0, 3).map((entry, index) => (
                      <li key={`summary-${index}`}>{entry}</li>
                    ))}
                  </ul>
                  <p style={{ marginBottom: "6px" }}>Classification artifacts: {selectedArtifacts.classification.length}</p>
                  <ul style={{ marginTop: 0 }}>
                    {selectedArtifacts.classification.slice(0, 3).map((entry, index) => (
                      <li key={`classification-${index}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
              }
            />
          ) : (
            <div style={{ borderRadius: "20px", border: "1px dashed #cbd5e1", background: "#ffffff", padding: "20px" }}>
              <p style={{ margin: 0 }}>Pick a feed card to restore continuity.</p>
            </div>
          )}
        </section>
      ) : null}

      {activeSurface === "session" ? (
        <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
          <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Execution session</h2>
              <button type="button" onClick={() => setActiveSurface("feed")}>
                Back to Focus Feed
              </button>
            </div>
            {!selectedTask ? <p style={{ margin: 0 }}>Pick a task from a feed card to start a session.</p> : null}
            {selectedTask ? (
              <TaskDetailCard
                title={selectedTask.title}
                status={selectedTask.status}
                onStart={() =>
                  void (async () => {
                    const session = await startTaskSession<SessionDto>(selectedTask.id);
                    setActiveSession(session);
                    await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
                  })()
                }
                onMarkDone={() =>
                  void (async () => {
                    await updateTask<TaskDto>(selectedTask.id, { status: "done" });
                    await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
                    setLastAction("Marked task done.");
                  })()
                }
              />
            ) : null}
          </div>
          {selectedTask && selectedTaskSession ? (
            <ActiveSessionScreen
              taskTitle={selectedTask.title}
              state={selectedTaskSession.state}
              startedAt={selectedTaskSession.startedAt}
              endedAt={selectedTaskSession.endedAt}
              contextPeek={
                executionSourceContext
                  ? {
                      title: executionSourceContext.title,
                      content: executionSourceContext.excerpt,
                      hint: executionSourceContext.updatedAt
                        ? `Source updated ${formatRelative(executionSourceContext.updatedAt) ?? "recently"}`
                        : `Session elapsed ${sessionElapsedLabel}`
                    }
                  : null
              }
              onPause={() =>
                void (async () => {
                  const updated = await pauseSession<SessionDto>(selectedTaskSession.id);
                  setActiveSession(updated);
                  await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
                })()
              }
              onFinish={() =>
                void (async () => {
                  const plannedMinutes = calculatePlannedMinutesForSession(selectedTask);
                  const updated = await finishSession<SessionDto>(selectedTaskSession.id);
                  const actualMinutesValue = Math.max(1, Math.floor(deriveSessionElapsedSeconds(updated) / 60));
                  const deltaMinutes = actualMinutesValue - plannedMinutes;
                  setActiveSession(updated);
                  await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
                  setLastAction("Finished a session.");
                  setPendingFinishRebalance({
                    taskTitle: selectedTask.title,
                    plannedMinutes,
                    actualMinutes: actualMinutesValue,
                    deltaMinutes,
                    suggestion: buildRebalanceSuggestion(deltaMinutes)
                  });
                })()
              }
              onOpenSource={() => {
                if (!selectedTaskSourceItem) return;
                setSelectedItemId(selectedTaskSourceItem.id);
                setSelectedContinuity({
                  whyShown: "Source context for active execution session.",
                  whereLeftOff: "Opened from Focus Mode context peek.",
                  changedSince: "Review source details without losing execution flow.",
                  nextStep: "Return to Focus Mode after confirming source context.",
                  lastTouched: formatRelative(selectedTaskSourceItem.updatedAt)
                });
                setActiveSurface("item");
              }}
              onReturnToFeed={() => setActiveSurface("feed")}
            />
          ) : (
            <div style={{ borderRadius: "20px", border: "1px dashed #94a3b8", background: "#ffffff", padding: "20px" }}>
              <p style={{ margin: 0 }}>No active session yet. Start one from the task card when you are ready.</p>
            </div>
          )}
        </section>
      ) : null}
      {pendingFinishRebalance ? (
        <FinishRebalanceSheet
          isOpen
          taskTitle={pendingFinishRebalance.taskTitle}
          plannedMinutes={pendingFinishRebalance.plannedMinutes}
          actualMinutes={pendingFinishRebalance.actualMinutes}
          deltaMinutes={pendingFinishRebalance.deltaMinutes}
          suggestion={pendingFinishRebalance.suggestion}
          isApplying={tasksLoading}
          onClose={() => setPendingFinishRebalance(null)}
          onContinuePlan={() => {
            void handleFinishAction("continue_plan");
          }}
          onRebalanceDay={() => {
            void handleFinishAction("rebalance_day");
          }}
          onTakeBreak={() => {
            void handleFinishAction("take_break");
          }}
          onScheduleRestLater={() => {
            void handleFinishAction("schedule_rest_later");
          }}
        />
      ) : null}
    </main>
  );
}
