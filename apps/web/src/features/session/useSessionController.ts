import { useCallback } from "react";
import type { YurbrainClient } from "@yurbrain/client";
import type { FeedLens } from "@yurbrain/ui";

import type { ContinuityContext, ConvertResponse, FeedCardDto, PlanPreviewDraft, PostponeDraft, SessionDto, TaskDto } from "../shared/types";
import { deriveSessionElapsedSeconds } from "./session-model";

function normalizePlanStepMinutes(index: number): number {
  return index === 0 ? 20 : 15;
}

type UseSessionControllerInput = {
  yurbrainClient: YurbrainClient;
  activeLens: FeedLens;
  selectedTaskId: string;
  tasks: TaskDto[];
  activeSession: SessionDto | null;
  pendingPlanPreview: PlanPreviewDraft | null;
  pendingPostponeSheet: PostponeDraft | null;
  setTasks: (updater: TaskDto[] | ((current: TaskDto[]) => TaskDto[])) => void;
  setSelectedTaskId: (taskId: string) => void;
  setActiveSession: (session: SessionDto | null) => void;
  setSessionHistory: (sessions: SessionDto[]) => void;
  setTasksLoading: (loading: boolean) => void;
  setTaskError: (error: string) => void;
  setConversionNotice: (notice: string) => void;
  setPendingPlanPreview: (draft: PlanPreviewDraft | null | ((current: PlanPreviewDraft | null) => PlanPreviewDraft | null)) => void;
  setPendingPostponeSheet: (draft: PostponeDraft | null) => void;
  setPendingFinishRebalance: (
    draft:
      | {
          taskTitle: string;
          plannedMinutes: number;
          actualMinutes: number;
          deltaMinutes: number;
          suggestion: string;
        }
      | null
  ) => void;
  setTimeActionNotice: (notice: string) => void;
  setLastAction: (action: string) => void;
  setActiveSurface: (surface: "feed" | "item" | "session" | "time" | "me") => void;
  setSelectedItemId: (itemId: string) => void;
  setSelectedContinuity: (continuity: ContinuityContext | null) => void;
  loadFeed: (lens: FeedLens) => Promise<void>;
  buildRebalanceSuggestion: (deltaMinutes: number) => string;
  calculatePlannedMinutesForSession: (task: TaskDto | null) => number;
  formatRelative: (isoValue?: string) => string | undefined;
};

export function useSessionController({
  yurbrainClient,
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
}: UseSessionControllerInput) {
  const loadSessionsForTask = useCallback(
    async (taskId: string) => {
      try {
        const sessions = await yurbrainClient.getSessions<SessionDto[]>({ taskId });
        const live = sessions.find((session) => session.state !== "finished");
        setActiveSession(live ?? sessions[0] ?? null);
      } catch {
        setTaskError("Could not load sessions for this task.");
        setActiveSession(null);
      }
    },
    [setActiveSession, setTaskError]
  );

  const loadAllSessionsForUser = useCallback(async () => {
    try {
      const sessions = await yurbrainClient.getSessions<SessionDto[]>({});
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
  }, [setSessionHistory]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const response = await yurbrainClient.getTasks<TaskDto[]>();
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
          const sessions = await yurbrainClient.getSessions<SessionDto[]>({ taskId: inProgressTask.id });
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
  }, [activeSession, selectedTaskId, setActiveSession, setSelectedTaskId, setTaskError, setTasks, setTasksLoading]);

  const refreshTaskAndSessionSignals = useCallback(async () => {
    await Promise.all([loadTasks(), loadAllSessionsForUser()]);
  }, [loadAllSessionsForUser, loadTasks]);

  const refreshExecutionData = useCallback(async () => {
    await Promise.all([loadTasks(), loadAllSessionsForUser()]);
  }, [loadAllSessionsForUser, loadTasks]);

  const openPlanPreview = useCallback(
    (input: { sourceItemId: string; title: string; steps: string[]; confidence: number }) => {
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
    },
    [setPendingPlanPreview]
  );

  const runConvert = useCallback(
    async (input: { itemId: string; content: string; sourceMessageId?: string }): Promise<TaskDto | null> => {
      setConversionNotice("");
      setTaskError("");
      try {
        const result = await yurbrainClient.planThis<ConvertResponse>({
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
        }
        if (result.outcome === "plan_suggested") {
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
    },
    [loadAllSessionsForUser, loadTasks, openPlanPreview, setConversionNotice, setSelectedTaskId, setTaskError, setTasks]
  );

  const createManualTaskFromFeedCard = useCallback(
    async (card: FeedCardDto): Promise<TaskDto> => {
      const fallbackTitle = card.title.trim().slice(0, 200) || "Follow up on resurfaced memory";
      const created = await yurbrainClient.planTask<TaskDto>({
        title: fallbackTitle,
        sourceItemId: card.itemId
      });
      setTasks((current) => [created, ...current.filter((task) => task.id !== created.id)]);
      setSelectedTaskId(created.id);
      setConversionNotice(`Task created: ${created.title}`);
      await Promise.all([loadTasks(), loadAllSessionsForUser()]);
      return created;
    },
    [loadAllSessionsForUser, loadTasks, setConversionNotice, setSelectedTaskId, setTasks]
  );

  const startSessionFromFeedCard = useCallback(
    async (card: FeedCardDto) => {
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
        const session = await yurbrainClient.startSession<SessionDto>(taskToStart.id);
        setActiveSession(session);
        setSelectedTaskId(taskToStart.id);
        setConversionNotice(`Session started: ${taskToStart.title}`);
        setActiveSurface("session");
        await Promise.all([loadTasks(), loadSessionsForTask(taskToStart.id), loadAllSessionsForUser()]);
      } catch {
        setTaskError("Could not start a session right now.");
      }
    },
    [
      createManualTaskFromFeedCard,
      loadAllSessionsForUser,
      loadSessionsForTask,
      loadTasks,
      runConvert,
      setActiveSession,
      setActiveSurface,
      setConversionNotice,
      setSelectedItemId,
      setSelectedTaskId,
      setTaskError,
      tasks
    ]
  );

  const updatePlanStepMinutes = useCallback(
    (stepId: string, minutes: number) => {
      setPendingPlanPreview((current) => {
        if (!current) return current;
        return {
          ...current,
          steps: current.steps.map((step) => (step.id === stepId ? { ...step, minutes: Math.max(5, Math.min(120, Math.trunc(minutes || 0))) } : step))
        };
      });
    },
    [setPendingPlanPreview]
  );

  const acceptPlanPreview = useCallback(
    async (startFirstStep: boolean) => {
      if (!pendingPlanPreview) return;
      setTaskError("");
      setTasksLoading(true);

      try {
        const createdTasks: TaskDto[] = [];
        for (const step of pendingPlanPreview.steps) {
          const created = await yurbrainClient.planTask<TaskDto>({
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
          const session = await yurbrainClient.startSession<SessionDto>(createdTasks[0].id);
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
    },
    [
      loadAllSessionsForUser,
      loadSessionsForTask,
      loadTasks,
      pendingPlanPreview,
      setActiveSession,
      setActiveSurface,
      setConversionNotice,
      setPendingPlanPreview,
      setSelectedTaskId,
      setTaskError,
      setTasks,
      setTasksLoading
    ]
  );

  const startPlanFirstStep = useCallback(async () => {
    await acceptPlanPreview(true);
  }, [acceptPlanPreview]);

  const handleFinishAction = useCallback(
    async (action: "continue_plan" | "rebalance_day" | "take_break" | "schedule_rest_later") => {
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
    },
    [setActiveSurface, setConversionNotice, setLastAction, setPendingFinishRebalance, setTimeActionNotice]
  );

  const startTimeTask = useCallback(
    async (taskId: string) => {
      try {
        setTaskError("");
        const session = await yurbrainClient.startSession<SessionDto>(taskId);
        setActiveSession(session);
        setSelectedTaskId(taskId);
        setTimeActionNotice("Session started from time window.");
        setActiveSurface("session");
        await Promise.all([loadTasks(), loadSessionsForTask(taskId), loadAllSessionsForUser()]);
      } catch {
        setTaskError("Could not start this task from time planning.");
      }
    },
    [loadAllSessionsForUser, loadSessionsForTask, loadTasks, setActiveSession, setActiveSurface, setSelectedTaskId, setTaskError, setTimeActionNotice]
  );

  const startWithoutPlanning = useCallback(async () => {
    const candidate = tasks.find((task) => task.status === "todo") ?? tasks.find((task) => task.status === "in_progress") ?? null;
    if (!candidate) {
      setTimeActionNotice("No task is available yet. Capture something first.");
      return;
    }
    await startTimeTask(candidate.id);
  }, [setTimeActionNotice, startTimeTask, tasks]);

  const openPostponeSheet = useCallback(
    (card: FeedCardDto) => {
      setPendingPostponeSheet({
        cardId: card.id,
        title: card.title,
        itemId: card.itemId ?? null,
        postponeCount: card.postponeCount ?? 0
      });
    },
    [setPendingPostponeSheet]
  );

  const applyPostponeMinutes = useCallback(
    async (minutes: number, notice: string) => {
      if (!pendingPostponeSheet) return;
      try {
        await yurbrainClient.snoozeFeedCard<{ ok: boolean }>(pendingPostponeSheet.cardId, minutes);
        await loadFeed(activeLens);
        setPendingPostponeSheet(null);
        setConversionNotice(notice);
        setTaskError("");
      } catch {
        setTaskError("Could not postpone this card right now.");
      }
    },
    [activeLens, loadFeed, pendingPostponeSheet, setConversionNotice, setPendingPostponeSheet, setTaskError]
  );

  const applyCustomPostpone = useCallback(
    async (isoDateTime: string) => {
      const targetMs = new Date(isoDateTime).getTime();
      if (!Number.isFinite(targetMs) || targetMs <= Date.now()) {
        setTaskError("Choose a future time to reschedule.");
        return;
      }
      const minutes = Math.max(5, Math.min(Math.ceil((targetMs - Date.now()) / 60_000), 60 * 24 * 7));
      await applyPostponeMinutes(minutes, "Scheduled for a specific return slot.");
    },
    [applyPostponeMinutes, setTaskError]
  );

  const breakIntoSmallerStep = useCallback(async () => {
    if (!pendingPostponeSheet) return;
    setTasksLoading(true);
    setTaskError("");
    try {
      const sourceItemId = pendingPostponeSheet.itemId;
      const baseTitle = pendingPostponeSheet.title.trim() || "resurfaced idea";
      const title = `Small step: ${baseTitle}`.slice(0, 200);
      const created = await yurbrainClient.planTask<TaskDto>({ title, sourceItemId });
      await yurbrainClient.snoozeFeedCard<{ ok: boolean }>(pendingPostponeSheet.cardId, 240);
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
  }, [
    activeLens,
    loadAllSessionsForUser,
    loadFeed,
    loadTasks,
    pendingPostponeSheet,
    setActiveSurface,
    setConversionNotice,
    setPendingPostponeSheet,
    setSelectedTaskId,
    setTaskError,
    setTasks,
    setTasksLoading
  ]);

  const startSelectedTaskSession = useCallback(
    async (task: TaskDto | null) => {
      if (!task) return;
      const session = await yurbrainClient.startSession<SessionDto>(task.id);
      setActiveSession(session);
      await Promise.all([loadTasks(), loadSessionsForTask(task.id), loadAllSessionsForUser()]);
    },
    [loadAllSessionsForUser, loadSessionsForTask, loadTasks, setActiveSession]
  );

  const markTaskDone = useCallback(
    async (task: TaskDto | null) => {
      if (!task) return;
      await yurbrainClient.updatePlannedTask<TaskDto>(task.id, { status: "done" });
      await Promise.all([loadTasks(), loadSessionsForTask(task.id), loadAllSessionsForUser()]);
      setLastAction("Marked task done.");
    },
    [loadAllSessionsForUser, loadSessionsForTask, loadTasks, setLastAction]
  );

  const pauseSelectedSession = useCallback(
    async (task: TaskDto | null, session: SessionDto | null) => {
      if (!task || !session) return;
      const updated = await yurbrainClient.blockSession<SessionDto>(session.id);
      setActiveSession(updated);
      await Promise.all([loadTasks(), loadSessionsForTask(task.id), loadAllSessionsForUser()]);
    },
    [loadAllSessionsForUser, loadSessionsForTask, loadTasks, setActiveSession]
  );

  const finishSelectedSession = useCallback(
    async (task: TaskDto | null, session: SessionDto | null, sourceItem: { id: string; updatedAt?: string } | null) => {
      if (!task || !session) return;
      const plannedMinutes = calculatePlannedMinutesForSession(task);
      const updated = await yurbrainClient.finishSession<SessionDto>(session.id);
      const actualMinutesValue = Math.max(1, Math.floor(deriveSessionElapsedSeconds(updated) / 60));
      const deltaMinutes = actualMinutesValue - plannedMinutes;
      setActiveSession(updated);
      await Promise.all([loadTasks(), loadSessionsForTask(task.id), loadAllSessionsForUser()]);
      setLastAction("Finished a session.");
      setPendingFinishRebalance({
        taskTitle: task.title,
        plannedMinutes,
        actualMinutes: actualMinutesValue,
        deltaMinutes,
        suggestion: buildRebalanceSuggestion(deltaMinutes)
      });

      if (sourceItem) {
        setSelectedItemId(sourceItem.id);
        setSelectedContinuity({
          whyShown: "Source context for active execution session.",
          whereLeftOff: "Opened from Focus Mode context peek.",
          changedSince: "Review source details without losing execution flow.",
          nextStep: "Return to Focus Mode after confirming source context.",
          lastTouched: formatRelative(sourceItem.updatedAt)
        });
      }
    },
    [
      buildRebalanceSuggestion,
      calculatePlannedMinutesForSession,
      formatRelative,
      loadAllSessionsForUser,
      loadSessionsForTask,
      loadTasks,
      setActiveSession,
      setLastAction,
      setPendingFinishRebalance,
      setSelectedContinuity,
      setSelectedItemId
    ]
  );

  return {
    loadTasks,
    loadSessionsForTask,
    loadAllSessionsForUser,
    refreshTaskAndSessionSignals,
    refreshExecutionData,
    runConvert,
    startSessionFromFeedCard,
    updatePlanStepMinutes,
    acceptPlanPreview,
    startPlanFirstStep,
    handleFinishAction,
    startTimeTask,
    startWithoutPlanning,
    openPostponeSheet,
    applyPostponeMinutes,
    applyCustomPostpone,
    breakIntoSmallerStep,
    startSelectedTaskSession,
    markTaskDone,
    pauseSelectedSession,
    finishSelectedSession
  };
}
