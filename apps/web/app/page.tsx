"use client";

import { useEffect, useMemo, useState } from "react";
import { FinishRebalanceSheet, PlanPreviewSheet, PostponeRescheduleSheet, type TimeWindowOption } from "@yurbrain/ui";

import { CapturePanel } from "../src/features/capture/CapturePanel";
import { useCaptureController } from "../src/features/capture/useCaptureController";
import { matchesExecutionLens, deriveFeedRequestLimit, formatRelative, inferBlockedState, inferContinuityNote, inferNextStep, inferVariant, inferWhereLeftOff, buildSyntheticDetailCard } from "../src/features/feed/feed-model";
import { FocusFeedSurface } from "../src/features/feed/FocusFeedSurface";
import { useFeedController } from "../src/features/feed/useFeedController";
import { FounderReviewSurface } from "../src/features/founder-review/FounderReviewSurface";
import { createFounderActionHandlers } from "../src/features/founder-review/founder-review-actions";
import { useFounderReviewController } from "../src/features/founder-review/useFounderReviewController";
import { useFounderSummaryController } from "../src/features/founder/useFounderSummaryController";
import { ItemDetailSurface } from "../src/features/item-detail/ItemDetailSurface";
import { buildRelatedItems, buildSuggestedPrompts } from "../src/features/item-detail/item-detail-model";
import { useBrainItemsController } from "../src/features/item-detail/useBrainItemsController";
import { useItemDetailController } from "../src/features/item-detail/useItemDetailController";
import { useAppShellState } from "../src/features/shell/useAppShellState";
import { usePreferenceController } from "../src/features/shell/usePreferenceController";
import { buildMeInsights, calculatePlannedMinutesForSession, deriveSessionElapsedSeconds, estimateTaskMinutes, formatDurationLabel, resolveTimeWindowMinutes, summarizeExecutionHint, buildRebalanceSuggestion } from "../src/features/session/session-model";
import { SessionSurface } from "../src/features/session/SessionSurface";
import { TimeSurface } from "../src/features/session/TimeSurface";
import { useSessionController } from "../src/features/session/useSessionController";
import type {
  ActiveTaskContextPeek,
  BrainItemDto,
  CaptureDraft,
  ContinuityContext,
  FeedCardDto,
  FeedCardModel,
  FinishRebalanceDraft,
  MeInsights,
  MessageDto,
  PlanPreviewDraft,
  PostponeDraft,
  SessionDto,
  TaskDto,
  UserPreferenceDto
} from "../src/features/shared/types";

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

  const [captureDraft, setCaptureDraft] = useState<CaptureDraft>({
    type: "text",
    content: "",
    source: "",
    note: ""
  });
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
  const [, setChatFallbackNotice] = useState("");
  const [conversionNotice, setConversionNotice] = useState("");
  const [itemActionNotice, setItemActionNotice] = useState("");
  const [pendingPlanPreview, setPendingPlanPreview] = useState<PlanPreviewDraft | null>(null);
  const [pendingPostponeSheet, setPendingPostponeSheet] = useState<PostponeDraft | null>(null);
  const [pendingFinishRebalance, setPendingFinishRebalance] = useState<FinishRebalanceDraft | null>(null);
  const [timeActionNotice, setTimeActionNotice] = useState("");
  const [personalizationNotice, setPersonalizationNotice] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [, setLastQuestion] = useState("");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
  const actionableTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const feedLimit = useMemo(() => deriveFeedRequestLimit(feedDensity, resurfacingIntensity), [feedDensity, resurfacingIntensity]);
  const windowMinutes = useMemo(() => resolveTimeWindowMinutes(timeWindow, customWindowMinutes), [customWindowMinutes, timeWindow]);
  const selectedItemTasks = useMemo(() => (selectedItem ? tasks.filter((task) => task.sourceItemId === selectedItem.id) : []), [selectedItem, tasks]);
  const selectedItemTask = useMemo(() => selectedItemTasks.find((task) => task.status !== "done") ?? selectedItemTasks[0] ?? null, [selectedItemTasks]);
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
      if (!existing || session.startedAt > existing.startedAt) {
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

  const feedModels = useMemo<FeedCardModel[]>(
    () =>
      feedCards.map((card) => {
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
            lastTouched: formatRelative(card.lastTouched ?? linkedItem?.updatedAt ?? linkedTask?.updatedAt ?? linkedSession?.startedAt),
            sourceItemId,
            sourceItemTitle: linkedItem?.title
          }
        };
      }),
    [feedCards, itemById, sessionByTaskId, taskById]
  );

  const visibleFeedModels = useMemo(() => (founderMode ? feedModels.filter((model) => matchesExecutionLens(model.variant, executionLens)) : feedModels), [executionLens, feedModels, founderMode]);
  const { founderStats, suggestedFocus, founderBlockedItems, founderSummaryText } = useFounderSummaryController({
    feedModels,
    visibleFeedModels,
    items,
    tasks,
    setSelectedItemId,
    setSelectedContinuity,
    setActiveSurface
  });

  const resumeSessionCard = useMemo(() => {
    if (!activeSession || activeSession.state === "finished") return null;
    const linkedTask = tasks.find((task) => task.id === activeSession.taskId);
    if (!linkedTask) return null;
    return { taskId: linkedTask.id, title: linkedTask.title, state: activeSession.state };
  }, [activeSession, tasks]);

  const timeSuggestedTasks = useMemo(() => {
    const ranked = actionableTasks
      .map((task) => ({ task, minutes: estimateTaskMinutes(task) }))
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
    return { tasks: picked, usedMinutes };
  }, [actionableTasks, windowMinutes]);

  const timeWindowLabel = timeWindow === "custom" ? `${windowMinutes}m` : timeWindow;
  const selectedItemSession = selectedItemTask && activeSession && activeSession.taskId === selectedItemTask.id ? activeSession : null;
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
  const syntheticDetailCard = useMemo(() => buildSyntheticDetailCard(selectedItem, selectedItemTask, selectedContinuity), [selectedContinuity, selectedItem, selectedItemTask]);
  const syntheticDetailVariant = useMemo(() => inferVariant(syntheticDetailCard, selectedItemTask ?? undefined, selectedItemSession ?? undefined), [selectedItemSession, selectedItemTask, syntheticDetailCard]);

  const derivedItemContinuity = useMemo(() => {
    const blockedState =
      selectedContinuity?.blockedState ??
      (syntheticDetailVariant === "blocked" ? inferBlockedState(syntheticDetailCard, selectedItemTask ?? undefined, selectedItemSession ?? undefined) : undefined);
    return {
      whyShown: selectedContinuity?.whyShown ?? (selectedItem ? "Resurfaced to restore context and keep this thought moving." : undefined),
      lastTouched: selectedContinuity?.lastTouched ?? formatRelative(selectedItem?.updatedAt),
      whereLeftOff:
        latestComment?.content ??
        (blockedState ? `Blocked: ${blockedState}` : selectedContinuity?.changedSince) ??
        "No continuation note yet; add one sentence to preserve re-entry.",
      changedSince:
        selectedContinuity?.changedSince ??
        (latestComment ? `Latest continuation note: ${latestComment.content}` : blockedState ? `Still blocked: ${blockedState}` : "No new updates since the last feed refresh."),
      blockedState,
      nextStep: selectedContinuity?.nextStep ?? inferNextStep(syntheticDetailCard, syntheticDetailVariant, selectedItemTask ?? undefined, selectedItemSession ?? undefined, selectedItem ?? undefined),
      executionHint: summarizeExecutionHint(selectedItemTask, selectedItemSession)
    };
  }, [latestComment, selectedContinuity, selectedItem, selectedItemSession, selectedItemTask, syntheticDetailCard, syntheticDetailVariant]);

  const allSessions = useMemo(() => {
    const byTask = new Map<string, SessionDto>();
    sessionHistory.forEach((session) => {
      const existing = byTask.get(session.taskId);
      if (!existing || new Date(session.startedAt).getTime() > new Date(existing.startedAt).getTime()) {
        byTask.set(session.taskId, session);
      }
    });
    if (activeSession) byTask.set(activeSession.taskId, activeSession);
    return Array.from(byTask.values());
  }, [activeSession, sessionHistory]);

  const meInsights = useMemo<MeInsights>(() => buildMeInsights({ tasks, sessions: allSessions, feedCards }), [allSessions, feedCards, tasks]);
  const reentryMessage = useMemo(() => {
    if (selectedItem) return `Last continuity touchpoint: ${selectedItem.title}.`;
    if (lastAction) return `Last action: ${lastAction}.`;
    return "Everything starts here. Open a card, continue, and return.";
  }, [lastAction, selectedItem]);

  const relatedItemsForDetail = useMemo(() => buildRelatedItems(selectedItem, items), [items, selectedItem]);
  const suggestedPromptsForDetail = useMemo(() => (selectedItem ? buildSuggestedPrompts(selectedItem, derivedItemContinuity.nextStep) : []), [derivedItemContinuity.nextStep, selectedItem]);

  const { handleLensChange, handleFounderModeToggle, handleRenderModeChange, handleAiSummaryModeChange, handleFeedDensityChange, handleResurfacingIntensityChange, loadUserPreferences } = usePreferenceController({
    hydrated,
    setActiveLens,
    setFounderMode,
    setRenderMode,
    setAiSummaryMode,
    setFeedDensity,
    setResurfacingIntensity,
    setPersonalizationNotice
  });

  const { loadFeed, openItemFromModel, openTaskFromCard, dismissCard, refreshCard } = useFeedController({
    feedLimit,
    activeLens,
    setFeedLoading,
    setFeedCards,
    setFeedError,
    setSelectedItemId,
    setSelectedTaskId,
    setSelectedContinuity,
    setActiveSurface
  });
  const founderActionHandlers = useMemo(
    () =>
      createFounderActionHandlers({
        setActiveSurface,
        setActiveLens,
        setExecutionLens,
        setFounderMode,
        setSelectedItemId,
        setSelectedContinuity,
        loadFeed
      }),
    [loadFeed, setActiveLens, setActiveSurface, setExecutionLens, setFounderMode, setSelectedContinuity, setSelectedItemId]
  );
  const {
    founderReview,
    founderReviewLoading,
    founderReviewError,
    founderReviewActionNotice,
    loadFounderReview,
    applyFounderReviewAction
  } = useFounderReviewController({
    activeSurface,
    onRunAction: founderActionHandlers.run
  });

  const { loadTasks, loadSessionsForTask, loadAllSessionsForUser, runConvert, startSessionFromFeedCard, updatePlanStepMinutes, acceptPlanPreview, startPlanFirstStep, handleFinishAction, startTimeTask, startWithoutPlanning, openPostponeSheet, applyPostponeMinutes, applyCustomPostpone, breakIntoSmallerStep, startSelectedTaskSession, markTaskDone, pauseSelectedSession, finishSelectedSession } = useSessionController({
    activeLens,
    selectedTaskId,
    tasks,
    activeSession,
    pendingPlanPreview,
    pendingPostponeSheet,
    setTasks,
    setSelectedTaskId,
    setActiveSession,
    setSessionHistory,
    setTasksLoading,
    setTaskError,
    setConversionNotice,
    setPendingPlanPreview,
    setPendingPostponeSheet,
    setPendingFinishRebalance,
    setTimeActionNotice,
    setLastAction,
    setActiveSurface,
    setSelectedItemId,
    setSelectedContinuity,
    loadFeed,
    buildRebalanceSuggestion,
    calculatePlannedMinutesForSession,
    formatRelative
  });

  const { loadItems } = useBrainItemsController({
    selectedItemId,
    setItems,
    setCaptureError,
    setSelectedItemId
  });

  const { captureItem, openCaptureSheet, handleVoiceCaptureStub } = useCaptureController({
    captureDraft,
    activeLens,
    setCaptureDraft,
    setCaptureSheetOpen,
    setCaptureLoading,
    setCaptureError,
    setCaptureStatusNotice,
    setCaptureSuccessNotice,
    setItems,
    setSelectedItemId,
    setSelectedTaskId,
    setActiveSurface,
    setLastAction,
    runConvert,
    loadFeed,
    loadTasks
  });

  const { loadSelectedItemContext, createComment, runQuickAction, runAiQuery, handleOpenRelatedItem } = useItemDetailController({
    selectedItem,
    selectedItemId,
    chatThreadId,
    relatedItemIds: relatedItemsForDetail.map((item) => item.id),
    derivedItemContinuity,
    setCommentThreadId,
    setChatThreadId,
    setCommentMessages,
    setChatMessages,
    setItemActionNotice,
    setItemContextLoading,
    setChatError,
    setChatFallbackNotice,
    setLastQuestion,
    setLastAction,
    setArtifactHistoryByItem,
    setSelectedItemId,
    setSelectedContinuity,
    runConvert
  });

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      const preferredLens = await loadUserPreferences();
      const lensForInitialLoad = preferredLens ?? activeLens;
      await Promise.all([loadItems(), loadFeed(lensForInitialLoad), loadTasks(), loadAllSessionsForUser()]);
    })();
  }, [activeLens, hydrated, loadAllSessionsForUser, loadFeed, loadItems, loadTasks, loadUserPreferences]);

  useEffect(() => {
    if (!hydrated) return;
    void loadFeed(activeLens);
  }, [activeLens, feedLimit, hydrated, loadFeed]);

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
  }, [hydrated, loadSelectedItemContext, selectedItemId]);

  useEffect(() => {
    if (!hydrated || !selectedTaskId) {
      setActiveSession(null);
      return;
    }
    void loadSessionsForTask(selectedTaskId);
  }, [hydrated, loadSessionsForTask, selectedTaskId]);

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
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      return left.createdAt.localeCompare(right.createdAt);
    });
    return merged.map((entry) => ({
      id: entry.id,
      label: entry.content,
      role: entry.role,
      timestamp: formatRelative(entry.createdAt)
    }));
  }, [chatMessages, commentMessages]);

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
              onOpenFounderReview={() => setActiveSurface("founder_review")}
              onOpenCaptureSheet={openCaptureSheet}
              onCaptureDraftChange={setCaptureDraft}
              onCaptureSubmit={(intent) => void captureItem(intent)}
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
          onConvertToTask={(itemId, body) =>
            void (async () => {
              const createdTask = await runConvert({ itemId, content: body });
              if (createdTask) setActiveSurface("session");
            })()
          }
          onStartSession={(card) => void startSessionFromFeedCard(card)}
          onDismiss={(cardId) => void dismissCard(cardId)}
          onSnooze={openPostponeSheet}
          onRefresh={(cardId) => void refreshCard(cardId)}
        />
      ) : null}

      {activeSurface === "founder_review" ? (
        <FounderReviewSurface
          review={founderReview}
          loading={founderReviewLoading}
          error={founderReviewError}
          actionNotice={founderReviewActionNotice}
          onRefresh={() => void loadFounderReview()}
          onRunAction={(action) => void applyFounderReviewAction(action)}
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
          onUpdateStepMinutes={updatePlanStepMinutes}
          onAcceptPlan={() => void acceptPlanPreview(false)}
          onStartFirstStep={() => void startPlanFirstStep()}
        />
      ) : null}

      {pendingPostponeSheet ? (
        <PostponeRescheduleSheet
          isOpen
          title={pendingPostponeSheet.title}
          postponeCount={pendingPostponeSheet.postponeCount}
          isSubmitting={tasksLoading}
          onClose={() => setPendingPostponeSheet(null)}
          onLaterToday={() => void applyPostponeMinutes(180, "Postponed for later today.")}
          onTomorrow={() => void applyPostponeMinutes(24 * 60, "Postponed for tomorrow.")}
          onSuggestSlot={() => {
            const suggestedMinutes = Math.min(12 * 60, 3 * 60 + pendingPostponeSheet.postponeCount * 60);
            void applyPostponeMinutes(suggestedMinutes, `Scheduled in about ${Math.round(suggestedMinutes / 60)}h.`);
          }}
          onBreakIntoSmallerStep={() => void breakIntoSmallerStep()}
          onApplyCustomDateTime={(isoDateTime) => void applyCustomPostpone(isoDateTime)}
        />
      ) : null}

      {activeSurface === "time" ? (
        <TimeSurface
          timeWindow={timeWindow}
          customWindowMinutes={customWindowMinutes}
          tasksLoading={tasksLoading}
          timeWindowLabel={timeWindow === "custom" ? `${windowMinutes}m` : timeWindow}
          windowMinutes={windowMinutes}
          resumeSessionCard={resumeSessionCard}
          timeSuggestedTasks={timeSuggestedTasks}
          timeActionNotice={timeActionNotice}
          taskError={taskError}
          onBackToFeed={() => setActiveSurface("feed")}
          onWindowChange={setTimeWindow}
          onCustomMinutesChange={setCustomWindowMinutes}
          onStartTimeTask={(taskId) => void startTimeTask(taskId)}
          onStartWithoutPlanning={() => void startWithoutPlanning()}
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
                  <select value={aiSummaryMode} onChange={(event) => handleAiSummaryModeChange(event.target.value as UserPreferenceDto["aiSummaryMode"])}>
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
                  <select value={resurfacingIntensity} onChange={(event) => handleResurfacingIntensityChange(event.target.value as UserPreferenceDto["resurfacingIntensity"])}>
                    <option value="gentle">Gentle</option>
                    <option value="balanced">Balanced</option>
                    <option value="active">Active</option>
                  </select>
                </label>
              </div>
              <p style={{ margin: 0, color: "#475569" }}>Current feed target: up to {feedLimit} cards ({feedDensity} + {resurfacingIntensity} intensity).</p>
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
          canStartSession={Boolean(selectedItemTask)}
          onBackToFeed={() => setActiveSurface("feed")}
          onQuickAction={(action) => void runQuickAction(action)}
          onAddComment={(itemId, comment) => void createComment(itemId, comment)}
          onConvertCommentToTask={(itemId, comment) =>
            void (async () => {
              const created = await createComment(itemId, comment);
              if (!created) return;
              await runConvert({ itemId, content: created.content, sourceMessageId: created.id });
              setActiveSurface("session");
            })()
          }
          onAskYurbrain={(question) => void runAiQuery(question)}
          onOpenRelatedItem={handleOpenRelatedItem}
          onStartSession={() =>
            void (async () => {
              if (!selectedItemTask) {
                setItemActionNotice("Plan this item first, then start a session.");
                return;
              }
              setSelectedTaskId(selectedItemTask.id);
              setActiveSurface("session");
              if (selectedItemSession && selectedItemSession.state !== "finished") return;
              await startSelectedTaskSession(selectedItemTask);
            })()
          }
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
                  hint: executionSourceContext.updatedAt ? `Source updated ${formatRelative(executionSourceContext.updatedAt) ?? "recently"}` : `Session elapsed ${sessionElapsedLabel}`
                }
              : null
          }
          onBackToFeed={() => setActiveSurface("feed")}
          onStartTaskSession={() => void startSelectedTaskSession(selectedTask)}
          onMarkTaskDone={() => void markTaskDone(selectedTask)}
          onPauseSession={() => void pauseSelectedSession(selectedTask, selectedTaskSession)}
          onFinishSession={() => void finishSelectedSession(selectedTask, selectedTaskSession, selectedTaskSourceItem ? { id: selectedTaskSourceItem.id, updatedAt: selectedTaskSourceItem.updatedAt } : null)}
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
          onContinuePlan={() => void handleFinishAction("continue_plan")}
          onRebalanceDay={() => void handleFinishAction("rebalance_day")}
          onTakeBreak={() => void handleFinishAction("take_break")}
          onScheduleRestLater={() => void handleFinishAction("schedule_rest_later")}
        />
      ) : null}
    </main>
  );
}
