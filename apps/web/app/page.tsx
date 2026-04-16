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
  FinishRebalanceSheet,
  PlanPreviewSheet,
  PostponeRescheduleSheet,
  type CaptureSubmitIntent,
  type FeedLens,
  type TimeWindowOption
} from "@yurbrain/ui";
import { CapturePanel } from "../src/features/capture/CapturePanel";
import {
  buildSyntheticDetailCard,
  deriveFeedRequestLimit,
  formatRelative,
  inferBlockedState,
  inferContinuityNote,
  inferNextStep,
  inferVariant,
  inferWhereLeftOff,
  matchesExecutionLens
} from "../src/features/feed/feed-model";
import { FocusFeedSurface } from "../src/features/feed/FocusFeedSurface";
import { ItemDetailSurface } from "../src/features/item-detail/ItemDetailSurface";
import { buildRelatedItems, buildSuggestedPrompts, deriveArtifactHistory } from "../src/features/item-detail/item-detail-model";
import { useAppShellState } from "../src/features/shell/useAppShellState";
import { captureSuccessMessages, userId } from "../src/features/shell/constants";
import {
  buildMeInsights,
  buildRebalanceSuggestion,
  calculatePlannedMinutesForSession,
  deriveSessionElapsedSeconds,
  estimateTaskMinutes,
  formatDurationLabel,
  resolveTimeWindowMinutes,
  selectActiveSession
} from "../src/features/session/session-model";
import { SessionSurface } from "../src/features/session/SessionSurface";
import { TimeSurface } from "../src/features/session/TimeSurface";
import type {
  ActiveTaskContextPeek,
  BrainItemDto,
  ContinuityContext,
  ConvertResponse,
  FeedCardDto,
  FeedCardModel,
  FinishRebalanceDraft,
  ItemArtifactDto,
  MeInsights,
  MessageDto,
  PlanPreviewDraft,
  PostponeDraft,
  SessionDto,
  TaskDto,
  ThreadDto,
  UserPreferenceDto
} from "../src/features/shared/types";

type Surface = "feed" | "item" | "session" | "time" | "me";

function normalizePlanStepMinutes(index: number): number {
  return index === 0 ? 20 : 15;
}
export default function Page() {
  const {
    hydrated,
    activeLens,
    setActiveLens,
    executionLens,
    setExecutionLens,
    founderMode,
    setFounderMode,
    renderMode,
    setRenderMode,
    aiSummaryMode,
    setAiSummaryMode,
    feedDensity,
    setFeedDensity,
    resurfacingIntensity,
    setResurfacingIntensity,
    activeSurface,
    setActiveSurface,
    selectedItemId,
    setSelectedItemId,
    selectedTaskId,
    setSelectedTaskId,
    timeWindow,
    setTimeWindow,
    customWindowMinutes,
    setCustomWindowMinutes
  } = useAppShellState();

  const [captureDraft, setCaptureDraft] = useState("");
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [items, setItems] = useState<BrainItemDto[]>([]);
  const [selectedContinuity, setSelectedContinuity] = useState<ContinuityContext | null>(null);

  const [commentThreadId, setCommentThreadId] = useState("");
  const [chatThreadId, setChatThreadId] = useState("");
  const [commentMessages, setCommentMessages] = useState<MessageDto[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageDto[]>([]);

  const [artifactHistoryByItem, setArtifactHistoryByItem] = useState<Record<string, { summary: string[]; classification: string[] }>>({});
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDto | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionDto[]>([]);

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
  const [personalizationNotice, setPersonalizationNotice] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
  const actionableTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const feedLimit = useMemo(
    () => deriveFeedRequestLimit(feedDensity, resurfacingIntensity),
    [feedDensity, resurfacingIntensity]
  );
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
          changedSince: inferContinuityNote(card, variant, linkedTask, linkedSession, linkedItem),
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
  }, [activeLens, feedLimit, hydrated]);

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
      const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: feedLimit });
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
      setRenderMode(preferences.renderMode);
      setAiSummaryMode(preferences.aiSummaryMode);
      setFeedDensity(preferences.feedDensity);
      setResurfacingIntensity(preferences.resurfacingIntensity);
      return preferences.defaultLens;
    } catch {
      return null;
    }
  }

  async function persistUserPreferences(
    updates: Partial<
      Pick<UserPreferenceDto, "defaultLens" | "founderMode" | "renderMode" | "aiSummaryMode" | "feedDensity" | "resurfacingIntensity">
    >
  ) {
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

  function handleRenderModeChange(nextMode: UserPreferenceDto["renderMode"]) {
    setRenderMode(nextMode);
    setPersonalizationNotice(nextMode === "focus" ? "Focus mode stays the default surface." : "Explore mode preference saved for future rendering.");
    if (hydrated) {
      void persistUserPreferences({ renderMode: nextMode });
    }
  }

  function handleAiSummaryModeChange(nextMode: UserPreferenceDto["aiSummaryMode"]) {
    setAiSummaryMode(nextMode);
    setPersonalizationNotice(`AI summary mode set to ${nextMode}.`);
    if (hydrated) {
      void persistUserPreferences({ aiSummaryMode: nextMode });
    }
  }

  function handleFeedDensityChange(nextDensity: UserPreferenceDto["feedDensity"]) {
    setFeedDensity(nextDensity);
    setPersonalizationNotice(`Feed density set to ${nextDensity}.`);
    if (hydrated) {
      void persistUserPreferences({ feedDensity: nextDensity });
    }
  }

  function handleResurfacingIntensityChange(nextIntensity: UserPreferenceDto["resurfacingIntensity"]) {
    setResurfacingIntensity(nextIntensity);
    setPersonalizationNotice(`Resurfacing intensity set to ${nextIntensity}.`);
    if (hydrated) {
      void persistUserPreferences({ resurfacingIntensity: nextIntensity });
    }
  }

  function syncItemArtifacts(itemId: string, artifacts: ItemArtifactDto[]) {
    const { summary, classification } = deriveArtifactHistory(artifacts);
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
    const continuityFromTask = !model.card.itemId && model.continuity.sourceItemId;
    setSelectedItemId(itemId);
    setSelectedContinuity(
      continuityFromTask
        ? {
            ...model.continuity,
            whyShown:
              model.continuity.whyShown ??
              `Opened from execution task${model.card.title ? `: ${model.card.title}` : ""}.`,
            whereLeftOff:
              model.continuity.whereLeftOff ??
              `Opened from task "${model.card.title}" to restore source continuity.`,
            changedSince:
              model.continuity.changedSince ??
              (model.continuity.sourceItemTitle
                ? `Source item: ${model.continuity.sourceItemTitle}.`
                : `Source item opened from task "${model.card.title}".`)
          }
        : model.continuity
    );
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
        <FocusFeedSurface
          activeLens={activeLens}
          executionLens={executionLens}
          founderMode={founderMode}
          reentryMessage={reentryMessage}
          feedLoading={feedLoading}
          feedError={feedError}
          visibleFeedModels={visibleFeedModels}
          conversionNotice={conversionNotice}
          taskError={taskError}
          tasksLoading={tasksLoading}
          capturePanel={
            <CapturePanel
              captureLoading={captureLoading}
              captureStatusNotice={captureStatusNotice}
              captureSheetOpen={captureSheetOpen}
              captureDraft={captureDraft}
              captureError={captureError}
              captureSuccessNotice={captureSuccessNotice}
              onOpenTimeHome={() => setActiveSurface("time")}
              onOpenMe={() => setActiveSurface("me")}
              onOpenCaptureSheet={openCaptureSheet}
              onCaptureDraftChange={setCaptureDraft}
              onCaptureSubmit={(intent) => {
                void captureItem(intent);
              }}
              onCaptureClose={() => {
                if (captureLoading) return;
                setCaptureSheetOpen(false);
                setCaptureError("");
                setCaptureSuccessNotice("");
              }}
              onVoiceCaptureStub={handleVoiceCaptureStub}
            />
          }
          founderStats={founderStats}
          suggestedFocus={suggestedFocus}
          founderBlockedItems={founderBlockedItems}
          founderSummaryText={founderSummaryText}
          onLensChange={handleLensChange}
          onExecutionLensChange={setExecutionLens}
          onFounderModeToggle={handleFounderModeToggle}
          onRetry={() => void loadFeed(activeLens)}
          onReload={() => void loadFeed(activeLens)}
          onOpenItem={openItemFromModel}
          onOpenTask={openTaskFromCard}
          onConvertToTask={(itemId, body) => {
            void (async () => {
              const createdTask = await runConvert({ itemId, content: body });
              if (createdTask) {
                setActiveSurface("session");
              }
            })();
          }}
          onStartSession={(card) => {
            void startSessionFromFeedCard(card);
          }}
          onDismiss={(cardId) => {
            void (async () => {
              await dismissFeedCard<{ ok: boolean }>(cardId);
              await loadFeed(activeLens);
            })();
          }}
          onSnooze={openPostponeSheet}
          onRefresh={(cardId) => {
            void (async () => {
              await refreshFeedCard<{ ok: boolean }>(cardId);
              await loadFeed(activeLens);
            })();
          }}
        />
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
        <TimeSurface
          timeWindow={timeWindow}
          customWindowMinutes={customWindowMinutes}
          tasksLoading={tasksLoading}
          timeWindowLabel={timeWindowLabel}
          windowMinutes={windowMinutes}
          resumeSessionCard={resumeSessionCard}
          timeSuggestedTasks={timeSuggestedTasks}
          timeActionNotice={timeActionNotice}
          taskError={taskError}
          onBackToFeed={() => setActiveSurface("feed")}
          onWindowChange={setTimeWindow}
          onCustomMinutesChange={setCustomWindowMinutes}
          onStartTimeTask={(taskId) => {
            void startTimeTask(taskId);
          }}
          onStartWithoutPlanning={() => {
            void startWithoutPlanning();
          }}
        />
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

            <section style={{ borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px", display: "grid", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", lineHeight: "22px" }}>Personalization</h3>
              <p style={{ margin: 0, color: "#475569" }}>Shape continuity defaults without changing the core loop.</p>
              <div style={{ display: "grid", gap: "10px" }}>
                <label style={{ display: "grid", gap: "4px" }}>
                  <span style={{ fontWeight: 700 }}>Render mode</span>
                  <select value={renderMode} onChange={(event) => handleRenderModeChange(event.target.value as UserPreferenceDto["renderMode"])}>
                    <option value="focus">Focus (default)</option>
                    <option value="explore">Explore (saved for future view)</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "4px" }}>
                  <span style={{ fontWeight: 700 }}>AI summary mode</span>
                  <select
                    value={aiSummaryMode}
                    onChange={(event) => handleAiSummaryModeChange(event.target.value as UserPreferenceDto["aiSummaryMode"])}
                  >
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "4px" }}>
                  <span style={{ fontWeight: 700 }}>Feed density</span>
                  <select value={feedDensity} onChange={(event) => handleFeedDensityChange(event.target.value as UserPreferenceDto["feedDensity"])}>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "4px" }}>
                  <span style={{ fontWeight: 700 }}>Resurfacing intensity</span>
                  <select
                    value={resurfacingIntensity}
                    onChange={(event) => handleResurfacingIntensityChange(event.target.value as UserPreferenceDto["resurfacingIntensity"])}
                  >
                    <option value="gentle">Gentle</option>
                    <option value="balanced">Balanced</option>
                    <option value="active">Active</option>
                  </select>
                </label>
              </div>
              <p style={{ margin: 0, color: "#475569" }}>
                Current feed target: up to {feedLimit} cards ({feedDensity} + {resurfacingIntensity} intensity).
              </p>
              {personalizationNotice ? <p style={{ margin: 0 }}>{personalizationNotice}</p> : null}
            </section>

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
        <ItemDetailSurface
          selectedItem={selectedItem}
          continuity={derivedItemContinuity}
          selectedArtifacts={selectedArtifacts}
          itemContextLoading={itemContextLoading}
          chatError={chatError}
          itemActionNotice={itemActionNotice}
          suggestedPromptsForDetail={suggestedPromptsForDetail}
          relatedItemsForDetail={relatedItemsForDetail}
          timelineEntries={timelineEntries}
          chatLines={chatLines}
          chatFallbackNotice={chatFallbackNotice}
          lastQuestion={lastQuestion}
          onBackToFeed={() => setActiveSurface("feed")}
          onQuickAction={(action) => {
            void runQuickAction(action);
          }}
          onAddComment={(itemId, comment) => {
            void createComment(itemId, comment);
          }}
          onConvertCommentToTask={(itemId, comment) => {
            void (async () => {
              const created = await createComment(itemId, comment);
              if (!created) return;
              await runConvert({ itemId, content: created.content, sourceMessageId: created.id });
              setActiveSurface("session");
            })();
          }}
          onAskYurbrain={(question) => {
            void runAiQuery(question);
          }}
          onOpenRelatedItem={handleOpenRelatedItem}
          onKeepInMind={handleKeepInMind}
          onRetryLastQuestion={() => {
            void runAiQuery(lastQuestion);
          }}
        />
      ) : null}

      {activeSurface === "session" ? (
        <SessionSurface
          selectedTask={selectedTask}
          selectedTaskSession={selectedTaskSession}
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
          onBackToFeed={() => setActiveSurface("feed")}
          onStartTaskSession={() => {
            if (!selectedTask) return;
            void (async () => {
              const session = await startTaskSession<SessionDto>(selectedTask.id);
              setActiveSession(session);
              await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
            })();
          }}
          onMarkTaskDone={() => {
            if (!selectedTask) return;
            void (async () => {
              await updateTask<TaskDto>(selectedTask.id, { status: "done" });
              await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
              setLastAction("Marked task done.");
            })();
          }}
          onPauseSession={() => {
            if (!selectedTask || !selectedTaskSession) return;
            void (async () => {
              const updated = await pauseSession<SessionDto>(selectedTaskSession.id);
              setActiveSession(updated);
              await Promise.all([loadTasks(), loadSessionsForTask(selectedTask.id), loadAllSessionsForUser()]);
            })();
          }}
          onFinishSession={() => {
            if (!selectedTask || !selectedTaskSession) return;
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
            })();
          }}
          onOpenSourceItem={() => {
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
        />
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
