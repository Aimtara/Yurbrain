"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiClient,
  convertToTask,
  createBrainItem,
  classifyBrainItem,
  createThread,
  dismissFeedCard,
  endpoints,
  finishSession,
  getFeed,
  listThreadMessages,
  listThreadsByTarget,
  pauseSession,
  sendMessage,
  startTaskSession,
  updateTask,
  queryBrainItemThread,
  refreshFeedCard,
  snoozeFeedCard,
  summarizeBrainItem
} from "@yurbrain/client";
import {
  ActiveSessionScreen,
  BrainItemScreen,
  CaptureComposer,
  FeedCard,
  FeedLensBar,
  ItemChatPanel,
  TaskDetailCard,
  type FeedLens
} from "@yurbrain/ui";

type FeedCardDto = {
  id: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: FeedLens;
  itemId: string | null;
  title: string;
  body: string;
  createdAt: string;
  lastRefreshedAt: string | null;
  whyShown: {
    summary: string;
    reasons: string[];
  };
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
type ConvertResponse =
  | {
      outcome: "create_task";
      confidence: number;
      task: TaskDto;
    }
  | {
      outcome: "mini_plan";
      confidence: number;
      title: string;
      steps: string[];
    }
  | {
      outcome: "not_recommended";
      confidence: number;
      reason: string;
    };

const userId = "11111111-1111-1111-1111-111111111111";
const storageKeys = {
  activeLens: "yurbrain.activeLens",
  selectedItemId: "yurbrain.selectedItemId",
  selectedTaskId: "yurbrain.selectedTaskId",
  session: "yurbrain.activeSession",
  summaries: "yurbrain.summaries",
  classifications: "yurbrain.classifications"
} as const;

function readStorageRecord(key: string): Record<string, string> {
  const raw = window.localStorage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => {
      return typeof entry[0] === "string" && typeof entry[1] === "string";
    });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [activeLens, setActiveLens] = useState<FeedLens>("all");
  const [captureDraft, setCaptureDraft] = useState("");
  const [items, setItems] = useState<BrainItemDto[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [commentThreadId, setCommentThreadId] = useState("");
  const [chatThreadId, setChatThreadId] = useState("");
  const [commentMessages, setCommentMessages] = useState<MessageDto[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageDto[]>([]);
  const [summaryByItem, setSummaryByItem] = useState<Record<string, string>>({});
  const [classificationByItem, setClassificationByItem] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activeSession, setActiveSession] = useState<SessionDto | null>(null);

  const [captureLoading, setCaptureLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [itemContextLoading, setItemContextLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [chatFallbackNotice, setChatFallbackNotice] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [conversionNotice, setConversionNotice] = useState("");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);
  const [feedError, setFeedError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [chatError, setChatError] = useState("");
  const [taskError, setTaskError] = useState("");

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
  const chatLines = useMemo(
    () =>
      chatMessages.map((message) => {
        if (message.role === "assistant") return `AI: ${message.content}`;
        if (message.role === "system") return `System: ${message.content}`;
        return `You: ${message.content}`;
      }),
    [chatMessages]
  );

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

    setSelectedItemId(window.localStorage.getItem(storageKeys.selectedItemId) ?? "");
    setSelectedTaskId(window.localStorage.getItem(storageKeys.selectedTaskId) ?? "");

    const storedSession = window.localStorage.getItem(storageKeys.session);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SessionDto;
        if (parsed.id && parsed.taskId && parsed.state) {
          setActiveSession(parsed);
        }
      } catch {
        window.localStorage.removeItem(storageKeys.session);
      }
    }

    setSummaryByItem(readStorageRecord(storageKeys.summaries));
    setClassificationByItem(readStorageRecord(storageKeys.classifications));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.activeLens, activeLens);
  }, [activeLens, hydrated]);

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
    window.localStorage.setItem(storageKeys.summaries, JSON.stringify(summaryByItem));
  }, [hydrated, summaryByItem]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.classifications, JSON.stringify(classificationByItem));
  }, [hydrated, classificationByItem]);

  useEffect(() => {
    if (!hydrated) return;
    if (!activeSession) {
      window.localStorage.removeItem(storageKeys.session);
      return;
    }
    window.localStorage.setItem(storageKeys.session, JSON.stringify(activeSession));
  }, [activeSession, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void Promise.all([loadItems(), loadFeed(activeLens), loadTasks()]);
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
      const nextItems = [...response].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      setCaptureError("Could not load your captured items.");
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
    } catch {
      setTaskError("Could not load tasks.");
    } finally {
      setTasksLoading(false);
    }
  }

  async function loadSelectedItemContext(itemId: string) {
    setItemContextLoading(true);
    try {
      const threads = await listThreadsByTarget<ThreadDto[]>(itemId);
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
      setChatError("");
    } catch {
      setChatError("Could not load comments/chat for this item.");
      setCommentMessages([]);
      setChatMessages([]);
    } finally {
      setItemContextLoading(false);
    }
  }

  async function ensureThreadForItem(itemId: string, kind: "item_comment" | "item_chat") {
    if (kind === "item_comment" && itemId === selectedItemId && commentThreadId) {
      return commentThreadId;
    }
    if (kind === "item_chat" && itemId === selectedItemId && chatThreadId) {
      return chatThreadId;
    }

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

    const thread = await ensureThreadForItem(itemId, "item_comment");
    const created = await sendMessage<MessageDto>({
      threadId: thread,
      role: "user",
      content: normalized
    });
    if (itemId === selectedItemId) {
      setCommentMessages((current) => [...current, created]);
    }
    return created;
  }

  async function captureItem() {
    const normalized = captureDraft.trim();
    if (!normalized) return;
    setCaptureLoading(true);
    setCaptureError("");

    const normalizedTitle = normalized.replace(/\s+/g, " ").slice(0, 80);
    const title = normalizedTitle.length === 0 ? "Captured note" : normalizedTitle;
    try {
      const created = await createBrainItem<BrainItemDto>({
        userId,
        type: "note",
        title,
        rawContent: normalized
      });
      setCaptureDraft("");
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedItemId(created.id);
      await Promise.all([loadFeed(activeLens), loadTasks()]);
    } catch {
      setCaptureError("Capture failed. Retry.");
    } finally {
      setCaptureLoading(false);
    }
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

      if (result.outcome === "create_task") {
        setTasks((current) => [result.task, ...current.filter((task) => task.id !== result.task.id)]);
        setSelectedTaskId(result.task.id);
        setConversionNotice(`Task created: ${result.task.title}`);
        await loadTasks();
        return result.task;
      } else if (result.outcome === "mini_plan") {
        setConversionNotice(`AI suggested a mini plan (${result.steps.length} steps) instead of a task.`);
      } else {
        setConversionNotice(`Task conversion skipped: ${result.reason}`);
      }
      await loadTasks();
      return null;
    } catch {
      setTaskError("Could not convert to task.");
      return null;
    }
  }

  async function startSessionFromFeedCard(card: FeedCardDto) {
    if (!card.itemId) return;

    setTaskError("");
    setSelectedItemId(card.itemId);

    const existingTask = tasks.find((task) => task.sourceItemId === card.itemId && task.status !== "done");
    const nextTask =
      existingTask ??
      (await runConvert({
        itemId: card.itemId,
        content: card.body
      }));

    if (!nextTask) {
      setTaskError("Could not start a session from this card yet.");
      return;
    }

    try {
      const session = await startTaskSession<SessionDto>(nextTask.id);
      setActiveSession(session);
      setSelectedTaskId(nextTask.id);
      setConversionNotice(`Session started: ${nextTask.title}`);
      await loadTasks();
    } catch {
      setTaskError("Could not start a session right now.");
    }
  }

  async function runQuickAction(action: "summarize" | "classify" | "convert_to_task") {
    if (!selectedItem) return;
    setLastAction(action);
    if (action === "convert_to_task" && selectedItem) {
      await runConvert({ itemId: selectedItem.id, content: selectedItem.rawContent });
      return;
    }

    try {
      if (action === "summarize") {
        const response = await summarizeBrainItem<{ ai: { content: string } }>({
          itemId: selectedItem.id,
          rawContent: selectedItem.rawContent
        });
        setSummaryByItem((current) => ({
          ...current,
          [selectedItem.id]: response.ai.content
        }));
      } else {
        const response = await classifyBrainItem<{ ai: { content: string } }>({
          itemId: selectedItem.id,
          rawContent: selectedItem.rawContent
        });
        setClassificationByItem((current) => ({
          ...current,
          [selectedItem.id]: response.ai.content
        }));
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

      const response = await queryBrainItemThread<{
        userMessage: MessageDto;
        message: MessageDto;
        fallbackUsed: boolean;
      }>({
        threadId: activeThreadId,
        question
      });
      setChatMessages((current) => [...current, response.userMessage, response.message]);
      setChatFallbackNotice(response.fallbackUsed ? "AI fallback used for this response." : "");
    } catch {
      setChatError("Could not reach AI query. You can retry your last message.");
      setChatFallbackNotice("AI query unavailable; defaulting to local echo.");
      setChatMessages((current) => [
        ...current,
        {
          id: `local-user-${Date.now()}`,
          threadId: chatThreadId,
          role: "user",
          content: question,
          createdAt: new Date().toISOString()
        },
        {
          id: `local-assistant-${Date.now()}`,
          threadId: chatThreadId,
          role: "assistant",
          content: "Local fallback response.",
          createdAt: new Date().toISOString()
        }
      ]);
    }
  }

  return (
    <main>
      <h1>Yurbrain</h1>
      <p>Focus is your home for resurfacing, continuing, and planning from memory.</p>

      <section>
        <h2>Capture</h2>
        <CaptureComposer value={captureDraft} onChange={setCaptureDraft} onSubmit={captureItem} />
        {captureLoading ? <p>Saving capture...</p> : null}
        {captureError ? <p>{captureError}</p> : null}
      </section>

      <hr />

      <section>
        <h2>Focus Feed</h2>
        <p>Window shop your mind: resurface what matters, then continue naturally.</p>
      <FeedLensBar
        lenses={["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"]}
        activeLens={activeLens}
        onChange={setActiveLens}
      />
      <button type="button" onClick={() => void loadFeed(activeLens)}>
        Refresh focus
      </button>
      {feedLoading ? <p>Gathering the most relevant memories...</p> : null}
      {feedError ? (
        <div>
          <p>{feedError}</p>
          <button onClick={() => void loadFeed(activeLens)}>Try again</button>
        </div>
      ) : null}
      {!feedError && feedCards.length === 0 ? (
        <p>This lens is quiet right now. Capture something new or switch lenses to resurface more.</p>
      ) : null}
      {feedCards.map((card) => (
        <FeedCard
          key={card.id}
          cardType={card.cardType}
          lens={card.lens}
          title={card.title}
          body={card.body}
          createdAt={card.createdAt}
          lastRefreshedAt={card.lastRefreshedAt}
          whyShown={card.whyShown}
          onContinue={card.itemId ? () => setSelectedItemId(card.itemId ?? "") : undefined}
          onComment={async (comment) => {
            if (!card.itemId) return;
            setSelectedItemId(card.itemId);
            await createComment(card.itemId, comment);
          }}
          onConvertToTask={async () => {
            if (!card.itemId) return;
            await runConvert({ itemId: card.itemId, content: card.body });
          }}
          onStartSession={card.itemId ? async () => startSessionFromFeedCard(card) : undefined}
          onDismiss={async () => {
            await dismissFeedCard<{ ok: boolean }>(card.id);
            await loadFeed(activeLens);
          }}
          onSnooze={async (minutes) => {
            await snoozeFeedCard<{ ok: boolean }>(card.id, minutes);
            await loadFeed(activeLens);
          }}
          onRefresh={async () => {
            await refreshFeedCard<{ ok: boolean }>(card.id);
            await loadFeed(activeLens);
          }}
        />
      ))}
      </section>

      <hr />

      <section>
        <h2>Items</h2>
        {items.length === 0 ? <p>No captured items yet.</p> : null}
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelectedItemId(item.id)}>
            {item.title}
          </button>
        ))}
      </section>

      <hr />

      <section>
        <h2>Item</h2>
        {!selectedItem ? <p>Select an item from feed or list.</p> : null}
        {selectedItem ? (
          <>
            {itemContextLoading ? <p>Loading item context...</p> : null}
            <BrainItemScreen
              item={selectedItem}
              comments={commentMessages.map((message) => message.content)}
              summary={summaryByItem[selectedItem.id]}
              classification={classificationByItem[selectedItem.id]}
              onQuickAction={(action) => void runQuickAction(action)}
              onAddComment={(comment) => {
                void createComment(selectedItem.id, comment);
              }}
              onConvertCommentToTask={(comment) => {
                void (async () => {
                  const created = await createComment(selectedItem.id, comment);
                  if (!created) return;
                  await runConvert({ itemId: selectedItem.id, content: created.content, sourceMessageId: created.id });
                })();
              }}
            />
            <ItemChatPanel
              onSend={(question) => void runAiQuery(question)}
              messages={chatLines}
              mode="ai_query"
              fallbackNotice={chatFallbackNotice}
              errorMessage={chatError}
              onRetry={lastQuestion ? () => void runAiQuery(lastQuestion) : undefined}
            />
            <p>Last quick action: {lastAction || "none"}</p>
          </>
        ) : null}
      </section>

      <hr />

      <section>
        <h2>Task + Session</h2>
        {tasksLoading ? <p>Loading tasks...</p> : null}
        {taskError ? <p>{taskError}</p> : null}
        {conversionNotice ? <p>{conversionNotice}</p> : null}
        {tasks.length === 0 ? <p>No tasks yet.</p> : null}
        {tasks.map((task) => (
          <button key={task.id} type="button" onClick={() => setSelectedTaskId(task.id)}>
            {task.title} ({task.status})
          </button>
        ))}
        {selectedTask ? (
          <>
            <TaskDetailCard
              title={selectedTask.title}
              status={selectedTask.status}
              onStart={async () => {
                const session = await startTaskSession<SessionDto>(selectedTask.id);
                setActiveSession(session);
                await loadTasks();
              }}
              onMarkDone={async () => {
                await updateTask<TaskDto>(selectedTask.id, { status: "done" });
                await loadTasks();
              }}
            />
            {activeSession && activeSession.taskId === selectedTask.id ? (
              <ActiveSessionScreen
                state={activeSession.state}
                onPause={async () => {
                  const updated = await pauseSession<SessionDto>(activeSession.id);
                  setActiveSession(updated);
                  await loadTasks();
                }}
                onFinish={async () => {
                  const updated = await finishSession<SessionDto>(activeSession.id);
                  setActiveSession(updated);
                  await loadTasks();
                }}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
