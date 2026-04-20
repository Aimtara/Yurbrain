import { useCallback, useEffect, useMemo, useState } from "react";
import { yurbrainDomainClient } from "@yurbrain/client";
import type { CaptureSubmitIntent } from "@yurbrain/ui";

import { mobileStorageKeys } from "../shared/constants";
import { getStoredState, setStoredState } from "../shared/storage";
import { buildFounderSummary } from "../shared/founder";
import { buildFeedCardModel } from "../shared/continuity";
import { formatIsoRelative, formatSessionDuration } from "../shared/time";
import type { BrainItemDto, CaptureDraft, ContinuityContext, FeedCardDto, FeedLens, ItemArtifactDto, MessageDto, MobileSurface, SessionDto, TaskDto, UserPreferenceDto } from "../shared/types";
import type { MobileLoopController } from "./types";

type CaptureIntakeResponse = {
  item: BrainItemDto;
  itemId: string;
};

function defaultCaptureDraft(): CaptureDraft {
  return {
    type: "text",
    content: "",
    source: "",
    note: ""
  };
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function conciseAiText(value: string, maxLength = 240): string {
  return clampText(compactText(value), maxLength);
}

function inferNextStep(card: FeedCardDto): string {
  if (card.taskId) return "Continue execution for this item.";
  if (card.cardType === "open_loop") return "Add one short update to close this loop.";
  return "Open and add one continuation note.";
}

function buildContinuityFromFeedCard(card: FeedCardDto): ContinuityContext {
  return {
    whyShown: card.whyShown.summary,
    whereLeftOff: card.whyShown.reasons[0] ?? "Resurfaced to restore context.",
    changedSince: card.whyShown.reasons[1] ?? "No new updates yet.",
    nextStep: inferNextStep(card),
    lastTouched: formatIsoRelative(card.lastTouched ?? card.lastRefreshedAt ?? card.createdAt),
    sourceItemId: card.itemId ?? undefined
  };
}

function deriveArtifactHistory(artifacts: ItemArtifactDto[]): { summary: string[]; classification: string[] } {
  const summary = artifacts
    .filter((artifact) => artifact.type === "summary")
    .map((artifact) => (typeof artifact.payload.content === "string" ? artifact.payload.content : JSON.stringify(artifact.payload)));
  const classification = artifacts
    .filter((artifact) => artifact.type === "classification")
    .map((artifact) => (typeof artifact.payload.content === "string" ? artifact.payload.content : JSON.stringify(artifact.payload)));
  return { summary, classification };
}

async function ensureThreadForItem(itemId: string, kind: "item_comment" | "item_chat"): Promise<string> {
  const threads = await yurbrainDomainClient.listThreadsByTarget<Array<{ id: string; kind: "item_comment" | "item_chat" }>>(itemId);
  const existing = threads.find((thread) => thread.kind === kind);
  if (existing) return existing.id;
  const created = await yurbrainDomainClient.createThread<{ id: string }>({ targetItemId: itemId, kind });
  return created.id;
}

function sortByNewest<T extends { updatedAt?: string; createdAt?: string }>(values: T[]): T[] {
  return [...values].sort((left, right) => {
    const leftKey = left.updatedAt ?? left.createdAt ?? "";
    const rightKey = right.updatedAt ?? right.createdAt ?? "";
    return rightKey.localeCompare(leftKey);
  });
}

export function useMobileLoopController(): MobileLoopController {
  const [hydrated, setHydrated] = useState(false);
  const [activeSurface, setActiveSurface] = useState<MobileSurface>("feed");
  const [activeLens, setActiveLens] = useState<FeedCardDto["lens"]>("all");
  const [founderMode, setFounderMode] = useState(false);
  const [executionLens, setExecutionLens] = useState<"all" | "ready_to_move" | "needs_unblock" | "momentum">("all");
  const [timeWindow, setTimeWindow] = useState<"2h" | "4h" | "6h" | "8h" | "24h" | "custom">("4h");
  const [customWindowMinutes, setCustomWindowMinutes] = useState("180");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);
  const [items, setItems] = useState<BrainItemDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDto | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionDto[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedContinuity, setSelectedContinuity] = useState<ContinuityContext | null>(null);
  const [commentThreadId, setCommentThreadId] = useState("");
  const [chatThreadId, setChatThreadId] = useState("");
  const [commentMessages, setCommentMessages] = useState<MessageDto[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageDto[]>([]);
  const [artifactHistoryByItem, setArtifactHistoryByItem] = useState<Record<string, { summary: string[]; classification: string[] }>>({});
  const [relatedByItem, setRelatedByItem] = useState<Record<string, Array<{ id: string; title: string; hint: string }>>>({});
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft>(defaultCaptureDraft());
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [captureStatusNotice, setCaptureStatusNotice] = useState("");
  const [captureSuccessNotice, setCaptureSuccessNotice] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [blockedReasonDraft, setBlockedReasonDraft] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [feedError, setFeedError] = useState("");
  const [itemError, setItemError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [timeNotice, setTimeNotice] = useState("");
  const [surfaceNotice, setSurfaceNotice] = useState("");
  const [stateRehydrated, setStateRehydrated] = useState(false);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
  const selectedItemTasks = useMemo(() => (selectedItem ? tasks.filter((task) => task.sourceItemId === selectedItem.id) : []), [selectedItem, tasks]);

  const timelineEntries = useMemo(
    () =>
      [...commentMessages, ...chatMessages]
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map((entry) => ({
          id: entry.id,
          role: entry.role,
          label: entry.content,
          timestamp: formatIsoRelative(entry.createdAt)
        })),
    [chatMessages, commentMessages]
  );

  const relatedItems = useMemo(() => {
    if (!selectedItem) return [];
    return relatedByItem[selectedItem.id] ?? [];
  }, [relatedByItem, selectedItem]);

  const itemContinuity = useMemo(
    () => ({
      whyShown: selectedContinuity?.whyShown ?? "Resurfaced to keep your continuity thread warm.",
      whereLeftOff: selectedContinuity?.whereLeftOff ?? "No continuation note yet.",
      changedSince: selectedContinuity?.changedSince ?? "No new updates yet.",
      nextStep: selectedContinuity?.nextStep ?? "Add one short update and return to Focus Feed.",
      lastTouched: selectedContinuity?.lastTouched ?? formatIsoRelative(selectedItem?.updatedAt),
      blockedState: selectedContinuity?.blockedState
    }),
    [selectedContinuity, selectedItem?.updatedAt]
  );

  const feedModels = useMemo(() => feedCards.map(buildFeedCardModel), [feedCards]);

  const visibleFeedModels = useMemo(() => {
    if (!founderMode) return feedModels;
    if (executionLens === "all") return feedModels;
    if (executionLens === "ready_to_move") {
      return feedModels.filter((model) => model.variant === "execution" || model.variant === "resume");
    }
    if (executionLens === "needs_unblock") {
      return feedModels.filter((model) => model.variant === "blocked");
    }
    return feedModels.filter((model) => model.variant === "execution" || model.variant === "done");
  }, [executionLens, feedModels, founderMode]);
  const founderSummary = useMemo(() => buildFounderSummary(visibleFeedModels), [visibleFeedModels]);

  const windowMinutes = useMemo(() => {
    if (timeWindow !== "custom") {
      return timeWindow === "2h" ? 120 : timeWindow === "4h" ? 240 : timeWindow === "6h" ? 360 : timeWindow === "8h" ? 480 : 1440;
    }
    const parsed = Number.parseInt(customWindowMinutes, 10);
    if (Number.isNaN(parsed)) return 180;
    return Math.max(30, Math.min(1440, parsed));
  }, [customWindowMinutes, timeWindow]);

  const suggestedTasksForWindow = useMemo(() => {
    const ranked = tasks
      .filter((task) => task.status !== "done")
      .map((task) => {
        const estimate = Math.max(15, Math.min(180, task.title.split(/\s+/).filter(Boolean).length * 5 + (task.status === "in_progress" ? 15 : 10)));
        return { task, minutes: estimate };
      })
      .sort((left, right) => {
        if (left.task.status !== right.task.status) {
          if (left.task.status === "in_progress") return -1;
          if (right.task.status === "in_progress") return 1;
        }
        return left.minutes - right.minutes;
      });
    const picked: Array<{ task: TaskDto; minutes: number }> = [];
    let usedMinutes = 0;
    for (const candidate of ranked) {
      if (picked.length >= 5) break;
      if (picked.length > 0 && usedMinutes + candidate.minutes > windowMinutes) continue;
      picked.push(candidate);
      usedMinutes += candidate.minutes;
    }
    return picked;
  }, [tasks, windowMinutes]);

  const selectedTaskSession = useMemo(() => {
    if (!selectedTask) return null;
    if (activeSession?.taskId === selectedTask.id) return activeSession;
    return sessionHistory.find((session) => session.taskId === selectedTask.id) ?? null;
  }, [activeSession, selectedTask, sessionHistory]);
  const sessionTabVisible = useMemo(
    () => Boolean(activeSession || selectedTask || selectedTaskSession || tasks.some((task) => task.status !== "done")),
    [activeSession, selectedTask, selectedTaskSession, tasks]
  );

  const executionContext = useMemo(() => {
    if (!selectedTask?.sourceItemId) return null;
    const source = items.find((item) => item.id === selectedTask.sourceItemId);
    if (!source) return null;
    return {
      title: source.title,
      content: source.rawContent.slice(0, 180),
      hint: source.updatedAt ? `Source updated ${formatIsoRelative(source.updatedAt)}` : undefined
    };
  }, [items, selectedTask?.sourceItemId]);

  const meInsights = useMemo(
    () => ({
      topInsight:
        tasks.filter((task) => task.status !== "done").length > 4
          ? "Most friction comes from too many open loops at once."
          : tasks.some((task) => task.status === "done")
            ? "Completion momentum is visible. Keep steps small."
            : "Start with one small session to build momentum.",
      estimation:
        sessionHistory.length === 0
          ? "No session data yet."
          : `Recent sessions: ${sessionHistory.length}. Keep windows realistic for mobile interruptions.`,
      carryForward: `${tasks.filter((task) => task.status !== "done").length} open tasks remain in your continuity loop.`,
      postponement: `${feedCards.reduce((sum, card) => sum + (card.postponeCount ?? 0), 0)} postpones currently tracked.`,
      recommendation:
        tasks.filter((task) => task.status !== "done").length > 4
          ? "Pause intake, close one loop, then capture again."
          : "Pick one task that fits your current window."
    }),
    [feedCards, sessionHistory.length, tasks]
  );

  const openCaptureSheet = useCallback(() => {
    setCaptureError("");
    setCaptureStatusNotice("");
    setCaptureSuccessNotice("");
    setCaptureSheetOpen(true);
  }, []);

  const closeCaptureSheet = useCallback(() => {
    if (captureLoading) return;
    setCaptureSheetOpen(false);
    setCaptureError("");
  }, [captureLoading]);

  const navigateToPrimarySurface = useCallback(
    (surface: MobileSurface) => {
      setActiveSurface(surface);
      if (surface === "feed") {
        setSurfaceNotice("Focus Feed is your re-entry home.");
      } else {
        setSurfaceNotice("");
      }
    },
    []
  );

  const loadFeed = useCallback(
    async (lens: FeedCardDto["lens"]) => {
      setFeedLoading(true);
      try {
        const cards = await yurbrainDomainClient.getFeed<FeedCardDto[]>({ lens, limit: 10 });
        setFeedCards(cards);
        setFeedError("");
      } catch {
        setFeedCards([]);
        setFeedError("Focus Feed took a short pause. Your captured thoughts are safe.");
      } finally {
        setFeedLoading(false);
      }
    },
    []
  );

  const loadItems = useCallback(async () => {
    try {
      const result = await yurbrainDomainClient.listBrainItems<BrainItemDto[]>();
      const ordered = sortByNewest(result);
      setItems(ordered);
      if (!selectedItemId && ordered.length > 0) {
        setSelectedItemId(ordered[0].id);
      }
    } catch {
      setItemError("Could not load captured items right now.");
    }
  }, [selectedItemId]);

  const loadTasks = useCallback(async () => {
    setTaskLoading(true);
    try {
      const result = await yurbrainDomainClient.listTasks<TaskDto[]>();
      const ordered = sortByNewest(result);
      setTasks(ordered);
      if (!selectedTaskId && ordered.length > 0) {
        setSelectedTaskId(ordered[0].id);
      }
      setTaskError("");
    } catch {
      setTaskError("Could not load task context.");
    } finally {
      setTaskLoading(false);
    }
  }, [selectedTaskId]);

  const loadSessionsForUser = useCallback(async () => {
    try {
      const sessions = await yurbrainDomainClient.listSessions<SessionDto[]>({});
      const ordered = [...sessions].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      setSessionHistory(ordered);
      const live = ordered.find((session) => session.state !== "finished") ?? null;
      setActiveSession(live);
    } catch {
      setSessionHistory([]);
      setActiveSession(null);
    }
  }, []);

  const loadItemContext = useCallback(
    async (itemId: string) => {
      setItemLoading(true);
      setItemError("");
      try {
        const [threads, artifacts, related] = await Promise.all([
          yurbrainDomainClient.listThreadsByTarget<Array<{ id: string; kind: "item_comment" | "item_chat" }>>(itemId),
          yurbrainDomainClient.listBrainItemArtifacts<ItemArtifactDto[]>(itemId),
          yurbrainDomainClient.listRelatedBrainItems<{ itemId: string; relatedItemIds: string[] }>(itemId)
        ]);
        const commentThread = threads.find((thread) => thread.kind === "item_comment");
        const chatThread = threads.find((thread) => thread.kind === "item_chat");
        setCommentThreadId(commentThread?.id ?? "");
        setChatThreadId(chatThread?.id ?? "");
        if (commentThread) {
          const messages = await yurbrainDomainClient.listThreadMessages<MessageDto[]>(commentThread.id);
          setCommentMessages(messages);
        } else {
          setCommentMessages([]);
        }
        if (chatThread) {
          const messages = await yurbrainDomainClient.listThreadMessages<MessageDto[]>(chatThread.id);
          setChatMessages(messages);
        } else {
          setChatMessages([]);
        }
        setArtifactHistoryByItem((current) => ({
          ...current,
          [itemId]: deriveArtifactHistory(artifacts)
        }));
        const relatedModels = related.relatedItemIds
          .map((id) => items.find((item) => item.id === id))
          .filter((entry): entry is BrainItemDto => Boolean(entry))
          .slice(0, 5)
          .map((entry) => ({
            id: entry.id,
            title: entry.title,
            hint: entry.topicGuess ? `Topic: ${entry.topicGuess}` : "Related context"
          }));
        setRelatedByItem((current) => ({
          ...current,
          [itemId]: relatedModels
        }));
      } catch {
        setItemError("Could not load item continuity details.");
        setCommentMessages([]);
        setChatMessages([]);
      } finally {
        setItemLoading(false);
      }
    },
    [items]
  );

  const captureItem = useCallback(
    async (intent: CaptureSubmitIntent) => {
      const normalized = captureDraft.content.trim();
      if (!normalized) return;
      setCaptureLoading(true);
      setCaptureError("");
      setCaptureStatusNotice("");
      setCaptureSuccessNotice("");
      try {
        const payload = {
          type: captureDraft.type,
          content: normalized,
          source: captureDraft.source.trim() || "mobile_capture_sheet",
          note: captureDraft.note.trim() || undefined
        };
        const intake = await yurbrainDomainClient.createCaptureIntake<CaptureIntakeResponse>(payload);
        const created = intake.item;
        setCaptureDraft(defaultCaptureDraft());
        setSelectedItemId(created.id);
        setSelectedContinuity({
          whyShown: "Captured just now from mobile.",
          whereLeftOff: "Fresh capture saved.",
          changedSince: "No updates yet.",
          nextStep: "Return to Focus Feed and continue when ready.",
          lastTouched: "just now",
          sourceItemId: created.id
        });
        setCaptureSuccessNotice(intent === "save" ? "Saved." : intent === "save_and_plan" ? "Saved and planning next step." : "Saved for gentle resurfacing.");
        if (intent === "save_and_plan") {
          await yurbrainDomainClient.planThis({
            sourceItemId: created.id,
            content: created.rawContent
          });
        }
        await Promise.all([loadFeed(activeLens), loadItems(), loadTasks(), loadSessionsForUser()]);
        setCaptureSheetOpen(false);
      } catch {
        setCaptureError("Capture failed. Try again.");
      } finally {
        setCaptureLoading(false);
      }
    },
    [activeLens, captureDraft, loadFeed, loadItems, loadSessionsForUser, loadTasks]
  );

  const openItemFromFeed = useCallback(
    (card: FeedCardDto) => {
      if (!card.itemId) {
        if (card.taskId) {
          setSelectedTaskId(card.taskId);
          setActiveSurface("session");
        }
        return;
      }
      setSelectedItemId(card.itemId);
      setSelectedContinuity(buildContinuityFromFeedCard(card));
      setActiveSurface("item");
    },
    []
  );

  const updateFounderProgressFromCard = useCallback(
    async (card: FeedCardDto) => {
      if (!card.itemId) return;
      const reason = card.whyShown.reasons[0] ?? card.whyShown.summary;
      const note = `Progress: moved ${card.title.toLowerCase()} forward. ${clampText(reason, 120)}`;
      try {
        setSelectedItemId(card.itemId);
        const threadId = commentThreadId || (await ensureThreadForItem(card.itemId, "item_comment"));
        if (!commentThreadId) setCommentThreadId(threadId);
        const created = await yurbrainDomainClient.sendMessage<MessageDto>({ threadId, role: "user", content: note });
        setCommentMessages((current) => [...current, created]);
        setSelectedContinuity({
          ...buildContinuityFromFeedCard(card),
          changedSince: "Founder update logged just now.",
          nextStep: "Keep momentum with one more concrete move."
        });
        setSurfaceNotice("Founder update saved. Keep momentum.");
      } catch {
        setTaskError("Could not log founder update.");
      }
    },
    [commentThreadId]
  );

  const openTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveSurface("session");
  }, []);

  const runFeedAction = useCallback(
    async (card: FeedCardDto, action: "continue" | "keep_in_focus" | "revisit_later" | "dismiss") => {
      setTaskError("");
      try {
        if (action === "continue") {
          openItemFromFeed(card);
          return;
        }
        if (action === "keep_in_focus") {
          await yurbrainDomainClient.refreshFeedCard<{ ok: boolean }>(card.id);
          setSurfaceNotice("Kept in focus.");
        } else if (action === "revisit_later") {
          await yurbrainDomainClient.snoozeFeedCard<{ ok: boolean }>(card.id, 180);
          setSurfaceNotice("Scheduled to resurface later today.");
        } else {
          await yurbrainDomainClient.dismissFeedCard<{ ok: boolean }>(card.id);
          setSurfaceNotice("Dismissed for now.");
        }
        await loadFeed(activeLens);
      } catch {
        setTaskError("Could not apply feed action right now.");
      }
    },
    [activeLens, loadFeed, openItemFromFeed]
  );

  const updateLens = useCallback(
    (lens: FeedCardDto["lens"]) => {
      setActiveLens(lens);
      void loadFeed(lens);
    },
    [loadFeed]
  );

  const toggleFounderMode = useCallback(
    async (enabled: boolean) => {
      setFounderMode(enabled);
      try {
        await yurbrainDomainClient.updateUserPreferenceMe<UserPreferenceDto>({
          founderMode: enabled
        });
      } catch {
        // Keep local mode if persistence fails.
      }
    },
    []
  );

  const runQuickAction = useCallback(
    async (action: "summarize_progress" | "next_step" | "classify" | "convert_to_task") => {
      if (!selectedItem) return;
      setAiBusy(true);
      setAiError("");
      try {
        if (action === "convert_to_task") {
          const converted = await yurbrainDomainClient.planThis<{ outcome: "task_created"; task: TaskDto } | { outcome: "plan_suggested" } | { outcome: "not_recommended"; reason: string }>({
            sourceItemId: selectedItem.id,
            content: selectedItem.rawContent
          });
          if (converted.outcome === "task_created") {
            setSelectedTaskId(converted.task.id);
            setActiveSurface("session");
            await Promise.all([loadTasks(), loadFeed(activeLens)]);
          } else if (converted.outcome === "plan_suggested") {
            setSurfaceNotice("Plan suggested. Creating one lightweight task.");
            const created = await yurbrainDomainClient.createTask<TaskDto>({
              title: `Small step: ${selectedItem.title}`.slice(0, 200),
              sourceItemId: selectedItem.id
            });
            setSelectedTaskId(created.id);
            setActiveSurface("session");
            await Promise.all([loadTasks(), loadFeed(activeLens)]);
          } else {
            setSurfaceNotice(`Not recommended: ${clampText(compactText(converted.reason), 120)}`);
          }
          return;
        }
        const itemIds = Array.from(new Set([selectedItem.id, ...relatedItems.map((item) => item.id)]));
        if (action === "summarize_progress") {
          const summary = await yurbrainDomainClient.summarizeCluster<{ summary: string; suggestedNextAction: string }>({ itemIds });
          const conciseSummary = conciseAiText(summary.summary, 240);
          const conciseNextAction = conciseAiText(summary.suggestedNextAction, 120);
          setArtifactHistoryByItem((current) => {
            const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
            return {
              ...current,
              [selectedItem.id]: { summary: [conciseSummary, ...existing.summary], classification: existing.classification }
            };
          });
          setSurfaceNotice(`Summary: ${conciseNextAction}`);
          return;
        }
        if (action === "next_step") {
          const next = await yurbrainDomainClient.requestNextStep<{ suggestedNextAction: string; reason: string }>({ itemIds });
          const conciseNextStep = conciseAiText(next.suggestedNextAction, 120);
          setSurfaceNotice(`Next: ${conciseNextStep}`);
          setSelectedContinuity((current) => ({
            ...(current ?? {}),
            nextStep: conciseNextStep
          }));
          return;
        }
        const classification = await yurbrainDomainClient.classifyBrainItem<{ ai: { content: string } }>({
          itemId: selectedItem.id,
          rawContent: selectedItem.rawContent
        });
        const conciseClassification = conciseAiText(classification.ai.content, 220);
        setArtifactHistoryByItem((current) => {
          const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
          return {
            ...current,
            [selectedItem.id]: { summary: existing.summary, classification: [conciseClassification, ...existing.classification] }
          };
        });
        setSurfaceNotice("Updated framing.");
      } catch {
        setAiError("AI support is unavailable. Try again in a moment.");
      } finally {
        setAiBusy(false);
      }
    },
    [activeLens, loadFeed, loadTasks, relatedItems, selectedItem]
  );

  const addComment = useCallback(
    async (value: string) => {
      if (!selectedItem) return;
      const normalized = value.trim();
      if (!normalized) return;
      try {
        const threadId = commentThreadId || (await ensureThreadForItem(selectedItem.id, "item_comment"));
        if (!commentThreadId) setCommentThreadId(threadId);
        const created = await yurbrainDomainClient.sendMessage<MessageDto>({
          threadId,
          role: "user",
          content: normalized
        });
        setCommentMessages((current) => [...current, created]);
        setSurfaceNotice("Update saved to timeline.");
      } catch {
        setItemError("Could not add update.");
      }
    },
    [commentThreadId, selectedItem]
  );

  const askYurbrain = useCallback(
    async (question: string) => {
      if (!selectedItem) return;
      const normalized = question.trim();
      if (!normalized) return;
      setAiBusy(true);
      setAiError("");
      try {
        const activeThreadId = chatThreadId || (await ensureThreadForItem(selectedItem.id, "item_chat"));
        if (!chatThreadId) setChatThreadId(activeThreadId);
        const continuityThreadId = commentThreadId || (await ensureThreadForItem(selectedItem.id, "item_comment"));
        if (!commentThreadId) setCommentThreadId(continuityThreadId);
        const response = await yurbrainDomainClient.queryBrainItemThread<{ userMessage: MessageDto; message: MessageDto }>({
          threadId: activeThreadId,
          question: normalized
        });
        const conciseAssistantMessage: MessageDto = {
          ...response.message,
          content: conciseAiText(response.message.content, 240)
        };
        setChatMessages((current) => [...current, response.userMessage, conciseAssistantMessage]);
        setCommentMessages((current) => [...current, response.userMessage, conciseAssistantMessage]);
        await Promise.all([
          yurbrainDomainClient.sendMessage<MessageDto>({ threadId: continuityThreadId, role: "user", content: response.userMessage.content }),
          yurbrainDomainClient.sendMessage<MessageDto>({ threadId: continuityThreadId, role: "assistant", content: conciseAssistantMessage.content })
        ]);
        setSurfaceNotice("Yurbrain reply added to timeline.");
      } catch {
        setAiError("Could not ask Yurbrain right now. Please retry.");
      } finally {
        setAiBusy(false);
      }
    },
    [chatThreadId, commentThreadId, selectedItem]
  );

  const blockSessionForSelectedTask = useCallback(
    async (reason?: string) => {
      if (!selectedTask) return;
      const normalizedReason = reason?.trim() || "Blocked due to unresolved dependency.";
      setSessionBusy(true);
      setTaskError("");
      try {
        if (selectedTaskSession && selectedTaskSession.state === "running") {
          await yurbrainDomainClient.pauseSession<SessionDto>(selectedTaskSession.id);
        }
        await yurbrainDomainClient.updateTask<TaskDto>(selectedTask.id, { status: "todo" });
        if (selectedTask.sourceItemId) {
          const sourceItem = items.find((item) => item.id === selectedTask.sourceItemId) ?? null;
          const threadId = commentThreadId || (await ensureThreadForItem(selectedTask.sourceItemId, "item_comment"));
          if (!commentThreadId) setCommentThreadId(threadId);
          const blockedMessage = await yurbrainDomainClient.sendMessage<MessageDto>({
            threadId,
            role: "user",
            content: `Blocked: ${clampText(normalizedReason, 240)}`
          });
          setCommentMessages((current) => [...current, blockedMessage]);
          setSelectedContinuity({
            whyShown: selectedContinuity?.whyShown ?? "Execution blocked and needs a re-entry plan.",
            whereLeftOff: selectedContinuity?.whereLeftOff ?? `Blocked while working on: ${selectedTask.title}`,
            changedSince: `Blocked update logged: ${clampText(normalizedReason, 120)}`,
            blockedState: normalizedReason,
            nextStep: "Unblock one dependency, then restart a lightweight session.",
            lastTouched: "just now",
            sourceItemId: selectedTask.sourceItemId,
            sourceItemTitle: sourceItem?.title
          });
          setSelectedItemId(selectedTask.sourceItemId);
        }
        setBlockedReasonDraft("");
        await Promise.all([loadTasks(), loadSessionsForUser(), loadFeed(activeLens)]);
        setActiveSurface("feed");
        setSurfaceNotice("Blocked update saved. Return to Focus Feed.");
      } catch {
        setTaskError("Could not mark session blocked.");
      } finally {
        setSessionBusy(false);
      }
    },
    [activeLens, commentThreadId, items, loadFeed, loadSessionsForUser, loadTasks, selectedContinuity, selectedTask, selectedTaskSession]
  );

  const openRelatedItem = useCallback((itemId: string) => {
    if (!itemId) return;
    setSelectedItemId(itemId);
    setSelectedContinuity(null);
    setActiveSurface("item");
  }, []);

  const openItemById = useCallback(
    (itemId: string, continuity?: ContinuityContext) => {
      if (!itemId) return;
      setSelectedItemId(itemId);
      setSelectedContinuity(continuity ?? null);
      setActiveSurface("item");
    },
    []
  );

  const startTask = useCallback(
    async (taskId: string) => {
      setSessionBusy(true);
      setTaskError("");
      try {
        const session = await yurbrainDomainClient.startSession<SessionDto>(taskId);
        setSelectedTaskId(taskId);
        setActiveSession(session);
        setActiveSurface("session");
        await Promise.all([loadTasks(), loadSessionsForUser(), loadFeed(activeLens)]);
      } catch {
        setTaskError("Could not start session.");
      } finally {
        setSessionBusy(false);
      }
    },
    [activeLens, loadFeed, loadSessionsForUser, loadTasks]
  );

  const startSessionForSelectedItem = useCallback(async () => {
    const candidate = selectedItemTasks.find((task) => task.status !== "done") ?? null;
    if (candidate) {
      await startTask(candidate.id);
      return;
    }
    if (!selectedItem) return;
    try {
      const created = await yurbrainDomainClient.createTask<TaskDto>({
        title: `Small step: ${selectedItem.title}`.slice(0, 200),
        sourceItemId: selectedItem.id
      });
      await Promise.all([loadTasks(), loadFeed(activeLens)]);
      await startTask(created.id);
    } catch {
      setTaskError("Could not prepare a task for session start.");
    }
  }, [activeLens, loadFeed, loadTasks, selectedItem, selectedItemTasks, startTask]);

  const pauseSessionForSelectedTask = useCallback(async () => {
    if (!selectedTaskSession) return;
    setSessionBusy(true);
    try {
      const paused = await yurbrainDomainClient.pauseSession<SessionDto>(selectedTaskSession.id);
      setActiveSession(paused);
      await loadSessionsForUser();
    } catch {
      setTaskError("Could not pause session.");
    } finally {
      setSessionBusy(false);
    }
  }, [loadSessionsForUser, selectedTaskSession]);

  const finishSessionForSelectedTask = useCallback(async () => {
    if (!selectedTaskSession || !selectedTask) return;
    setSessionBusy(true);
    try {
      const finished = await yurbrainDomainClient.finishSession<SessionDto>(selectedTaskSession.id);
      setActiveSession(finished);
      await yurbrainDomainClient.updateTask<TaskDto>(selectedTask.id, { status: "done" });
      await Promise.all([loadTasks(), loadSessionsForUser(), loadFeed(activeLens)]);
      setActiveSurface("feed");
      setSurfaceNotice("Session finished. Return to Focus Feed.");
    } catch {
      setTaskError("Could not finish session.");
    } finally {
      setSessionBusy(false);
    }
  }, [activeLens, loadFeed, loadSessionsForUser, loadTasks, selectedTask, selectedTaskSession]);

  const markTaskDone = useCallback(async () => {
    if (!selectedTask) return;
    setSessionBusy(true);
    try {
      await yurbrainDomainClient.updateTask<TaskDto>(selectedTask.id, { status: "done" });
      await Promise.all([loadTasks(), loadFeed(activeLens)]);
      setSurfaceNotice("Task marked done.");
    } catch {
      setTaskError("Could not mark task done.");
    } finally {
      setSessionBusy(false);
    }
  }, [activeLens, loadFeed, loadTasks, selectedTask]);

  const startWithoutPlanning = useCallback(async () => {
    const candidate = suggestedTasksForWindow[0];
    if (!candidate) {
      setTimeNotice("No suggested task yet. Capture first, then return.");
      return;
    }
    setTimeNotice("");
    await startTask(candidate.task.id);
  }, [startTask, suggestedTasksForWindow]);

  const switchToFeedForReentry = useCallback(() => {
    setActiveSurface("feed");
    setSurfaceNotice("Returned to Focus Feed for re-entry.");
  }, []);

  useEffect(() => {
    if (stateRehydrated) return;
    const restoredSurface = getStoredState<MobileSurface>(mobileStorageKeys.activeSurface);
    if (restoredSurface && ["feed", "item", "session", "time", "me"].includes(restoredSurface)) {
      setActiveSurface(restoredSurface);
    }
    const restoredLens = getStoredState<FeedLens>(mobileStorageKeys.activeLens);
    if (restoredLens && ["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"].includes(restoredLens)) {
      setActiveLens(restoredLens);
    }
    const restoredFounderMode = getStoredState<boolean>(mobileStorageKeys.founderMode);
    if (typeof restoredFounderMode === "boolean") {
      setFounderMode(restoredFounderMode);
    }
    const restoredTimeWindow = getStoredState<"2h" | "4h" | "6h" | "8h" | "24h" | "custom">(mobileStorageKeys.timeWindow);
    if (restoredTimeWindow && ["2h", "4h", "6h", "8h", "24h", "custom"].includes(restoredTimeWindow)) {
      setTimeWindow(restoredTimeWindow);
    }
    const restoredCustomMinutes = getStoredState<string>(mobileStorageKeys.customWindowMinutes);
    if (typeof restoredCustomMinutes === "string" && restoredCustomMinutes.trim().length > 0) {
      setCustomWindowMinutes(restoredCustomMinutes);
    }
    const restoredItemId = getStoredState<string>(mobileStorageKeys.selectedItemId);
    if (typeof restoredItemId === "string") {
      setSelectedItemId(restoredItemId);
    }
    const restoredTaskId = getStoredState<string>(mobileStorageKeys.selectedTaskId);
    if (typeof restoredTaskId === "string") {
      setSelectedTaskId(restoredTaskId);
    }
    setStateRehydrated(true);
  }, [stateRehydrated]);

  useEffect(() => {
    void (async () => {
      try {
        const preferences = await yurbrainDomainClient.getUserPreferenceMe<UserPreferenceDto>();
        setFounderMode(preferences.founderMode);
        setActiveLens(preferences.defaultLens);
      } catch {
        // Keep local defaults.
      }
      await Promise.all([loadItems(), loadTasks(), loadSessionsForUser(), loadFeed(activeLens)]);
      setHydrated(true);
    })();
    // initial bootstrap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || !selectedItemId) return;
    void loadItemContext(selectedItemId);
  }, [hydrated, loadItemContext, selectedItemId]);

  useEffect(() => {
    if (!hydrated) return;
    void loadFeed(activeLens);
  }, [activeLens, hydrated, loadFeed]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.activeSurface, activeSurface);
  }, [activeSurface, stateRehydrated]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.activeLens, activeLens);
  }, [activeLens, stateRehydrated]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.founderMode, founderMode);
  }, [founderMode, stateRehydrated]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.timeWindow, timeWindow);
  }, [stateRehydrated, timeWindow]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.customWindowMinutes, customWindowMinutes);
  }, [customWindowMinutes, stateRehydrated]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.selectedItemId, selectedItemId || null);
  }, [selectedItemId, stateRehydrated]);

  useEffect(() => {
    if (!stateRehydrated) return;
    setStoredState(mobileStorageKeys.selectedTaskId, selectedTaskId || null);
  }, [selectedTaskId, stateRehydrated]);

  const controller: MobileLoopController = {
    activeSurface,
    activeLens,
    founderMode,
    executionLens,
    captureSheetOpen,
    captureDraft,
    captureLoading,
    captureError,
    captureStatusNotice,
    captureSuccessNotice,
    feedLoading,
    itemLoading,
    aiBusy,
    aiError,
    feedError,
    itemError,
    taskError,
    timeNotice,
    surfaceNotice,
    timeWindow,
    customWindowMinutes,
    windowMinutes,
    feedCards: visibleFeedModels,
    founderSummary,
    founderStats: founderSummary.stats,
    tasks,
    activeSession,
    selectedItem,
    selectedTask,
    selectedTaskSession,
    relatedItems,
    timelineEntries,
    itemContinuity,
    executionContext,
    sessionElapsedLabel: formatSessionDuration(selectedTaskSession),
    suggestedTasksForWindow,
    meTopInsight: meInsights.topInsight,
    meRecommendation: meInsights.recommendation,
    sessionTabVisible,
    setCaptureDraft,
    closeCaptureSheet,
    openCaptureSheet,
    navigateToPrimarySurface,
    updateLens,
    toggleFounderMode,
    setExecutionLens,
    captureItem,
    openItemFromFeed,
    updateFounderProgressFromCard,
    openTask,
    runFeedAction,
    runQuickAction,
    updateItemComment: addComment,
    askItemQuestion: askYurbrain,
    openRelatedItem,
    startTask,
    startSessionFromItem: startSessionForSelectedItem,
    pauseActiveSession: pauseSessionForSelectedTask,
    finishActiveSession: finishSessionForSelectedTask,
    pauseSessionForSelectedTask,
    finishSessionForSelectedTask,
    blockedReasonDraft,
    setBlockedReasonDraft,
    markTaskDone,
    blockSessionForSelectedTask,
    setTimeWindow,
    setCustomWindowMinutes,
    startWithoutPlanning,
    switchToFeedForReentry,
    refreshFeed: () => loadFeed(activeLens),
    dismissCard: async (cardId) => {
      const card = feedCards.find((entry) => entry.id === cardId);
      if (!card) return;
      await runFeedAction(card, "dismiss");
    },
    snoozeCard: async (cardId, minutes = 180) => {
      const card = feedCards.find((entry) => entry.id === cardId);
      if (!card) return;
      await yurbrainDomainClient.snoozeFeedCard<{ ok: boolean }>(card.id, minutes);
      await loadFeed(activeLens);
    },
    keepCardInFocus: async (cardId) => {
      const card = feedCards.find((entry) => entry.id === cardId);
      if (!card) return;
      await runFeedAction(card, "keep_in_focus");
    },
    openCard: async (cardId) => {
      const card = feedCards.find((entry) => entry.id === cardId);
      if (!card) return;
      openItemFromFeed(card);
    },
    retryFeed: () => loadFeed(activeLens)
  };

  return controller;
}
