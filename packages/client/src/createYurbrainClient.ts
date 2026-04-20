import { apiClient } from "./api/client";
import { bootstrapNhostSession } from "./auth/nhost";
import { createYurbrainDomainClient, type YurbrainDomainClient } from "./domain/client";

type FounderReviewQuery = {
  window?: "7d";
  userId?: string;
  includeAi?: boolean;
};

type FeedQuery = {
  lens?: string;
  limit?: number;
  includeSnoozed?: boolean;
};

type ItemThreadKind = "item_comment" | "item_chat";

type TouchBrainItemResult = {
  id: string;
  title: string;
  rawContent: string;
  status: "active" | "archived";
};

export type YurbrainClient = {
  getCurrentUser: <T = { id: string; source: string }>() => Promise<T>;
  getCurrentUserPreference: <T>() => Promise<T>;
  setFounderMode: <T = unknown>(enabled: boolean) => Promise<T>;
  setDefaultFeedLens: <T = unknown>(lens: string) => Promise<T>;
  setPreferencePatch: <T>(payload: unknown) => Promise<T>;
  getFeed: <T>(query?: FeedQuery) => Promise<T>;
  dismissFeedCard: <T>(cardId: string) => Promise<T>;
  snoozeFeedCard: <T>(cardId: string, minutes?: number) => Promise<T>;
  refreshFeedCard: <T>(cardId: string) => Promise<T>;
  createCaptureIntake: <T>(payload: unknown) => Promise<T>;
  listBrainItems: <T>() => Promise<T>;
  getBrainItem: <T>(itemId: string) => Promise<T>;
  touchBrainItem: <T = unknown>(itemId: string) => Promise<T>;
  getItemContext: <T>(itemId: string) => Promise<T>;
  ensureItemThread: (itemId: string, kind: ItemThreadKind) => Promise<{ id: string }>;
  addThreadMessage: <T>(payload: { threadId: string; role: "user" | "assistant"; content: string }) => Promise<T>;
  addComment: <T>(threadId: string, content: string) => Promise<T>;
  planThis: <T>(payload: unknown) => Promise<T>;
  planTask: <T>(payload: unknown) => Promise<T>;
  updatePlannedTask: <T>(taskId: string, payload: unknown) => Promise<T>;
  getTasks: <T>(query?: { status?: "todo" | "in_progress" | "done"; userId?: string }) => Promise<T>;
  getSessions: <T>(query: { taskId?: string; userId?: string; state?: "running" | "paused" | "finished" }) => Promise<T>;
  startSession: <T>(taskId: string) => Promise<T>;
  finishSession: <T>(sessionId: string) => Promise<T>;
  blockSession: <T>(sessionId: string) => Promise<T>;
  summarizeProgress: <T>(payload: { itemIds: string[] }) => Promise<T>;
  getNextStep: <T>(payload: { itemIds: string[] }) => Promise<T>;
  classifyBrainItem: <T>(payload: {
    itemId: string;
    rawContent: string;
    timeoutMs?: number;
  }) => Promise<T>;
  queryBrainItemThread: <T>(payload: {
    threadId: string;
    question: string;
    timeoutMs?: number;
  }) => Promise<T>;
  getFounderReview: <T>(query?: FounderReviewQuery) => Promise<T>;
  getFounderDiagnostics: <T>(query?: FounderReviewQuery) => Promise<T>;
};

export type CreateYurbrainClientOptions = {
  transport?: "rest" | "nhost";
  domainClient?: YurbrainDomainClient;
};

function renderQuery(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!value) continue;
    params.set(key, value);
  }
  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

function createDomainBackedClient(domainClient: YurbrainDomainClient): YurbrainClient {
  return {
    getCurrentUser: () => domainClient.getAuthMe(),
    getCurrentUserPreference: () => domainClient.getUserPreferenceMe(),
    setFounderMode: (enabled) =>
      domainClient.updateUserPreferenceMe({
        founderMode: enabled
      }),
    setDefaultFeedLens: (lens) =>
      domainClient.updateUserPreferenceMe({
        defaultLens: lens
      }),
    setPreferencePatch: (payload) => domainClient.updateUserPreferenceMe(payload),
    getFeed: (query = {}) => domainClient.getFeed(query),
    dismissFeedCard: (cardId) => domainClient.dismissFeedCard(cardId),
    snoozeFeedCard: (cardId, minutes) => domainClient.snoozeFeedCard(cardId, minutes),
    refreshFeedCard: (cardId) => domainClient.refreshFeedCard(cardId),
    createCaptureIntake: (payload) => domainClient.createCaptureIntake(payload),
    listBrainItems: () => domainClient.listBrainItems(),
    getBrainItem: (itemId) => domainClient.getBrainItem(itemId),
    touchBrainItem: async (itemId) => {
      const existing = await domainClient.getBrainItem<TouchBrainItemResult>(itemId);
      return domainClient.updateBrainItem(itemId, {
        title: existing.title,
        rawContent: existing.rawContent,
        status: existing.status
      });
    },
    getItemContext: async (itemId) => {
      const [threads, artifacts, relatedItems] = await Promise.all([
        domainClient.listThreadsByTarget<Array<{ id: string; kind: ItemThreadKind }>>(itemId),
        domainClient.listBrainItemArtifacts(itemId),
        domainClient.listRelatedBrainItems<{ relatedItemIds?: string[] }>(itemId)
      ]);
      const commentThread = threads.find((thread) => thread.kind === "item_comment");
      const chatThread = threads.find((thread) => thread.kind === "item_chat");
      const [commentMessages, chatMessages] = await Promise.all([
        commentThread ? domainClient.listThreadMessages(commentThread.id) : Promise.resolve([]),
        chatThread ? domainClient.listThreadMessages(chatThread.id) : Promise.resolve([])
      ]);
      return {
        threads,
        artifacts,
        relatedItemIds: relatedItems.relatedItemIds ?? [],
        commentMessages,
        chatMessages
      };
    },
    ensureItemThread: async (itemId, kind) => {
      const threads = await domainClient.listThreadsByTarget<Array<{ id: string; kind: ItemThreadKind }>>(itemId);
      const existing = threads.find((thread) => thread.kind === kind);
      if (existing) {
        return { id: existing.id };
      }
      const created = await domainClient.createThread<{ id: string }>({ targetItemId: itemId, kind });
      return { id: created.id };
    },
    addThreadMessage: (payload) => domainClient.sendMessage(payload),
    addComment: (threadId, content) => domainClient.addComment(threadId, content),
    planThis: (payload) => domainClient.planThis(payload),
    planTask: (payload) => domainClient.createTask(payload),
    updatePlannedTask: (taskId, payload) => domainClient.updateTask(taskId, payload),
    getTasks: (query = {}) => domainClient.listTasks(query),
    getSessions: (query) => domainClient.listSessions(query),
    startSession: (taskId) => domainClient.startSession(taskId),
    finishSession: (sessionId) => domainClient.finishSession(sessionId),
    blockSession: (sessionId) => domainClient.pauseSession(sessionId),
    summarizeProgress: (payload) => domainClient.summarizeProgress(payload),
    getNextStep: (payload) => domainClient.getWhatShouldIDoNext(payload),
    classifyBrainItem: (payload) => domainClient.classifyBrainItem(payload),
    queryBrainItemThread: (payload) => domainClient.queryBrainItemThread(payload),
    getFounderReview: (query = {}) => domainClient.getFounderReview(query),
    getFounderDiagnostics: (query = {}) =>
      apiClient(
        `/functions/founder-review/diagnostics${renderQuery({
          window: query.window ?? "7d",
          userId: query.userId,
          includeAi: query.includeAi ? "1" : undefined
        })}`
      )
  };
}

export function createRestBackedYurbrainClient(options: CreateYurbrainClientOptions = {}): YurbrainClient {
  const domainClient = options.domainClient ?? createYurbrainDomainClient();
  return createDomainBackedClient(domainClient);
}

function createNhostBackedYurbrainClient(options: CreateYurbrainClientOptions = {}): YurbrainClient {
  const baseClient = createRestBackedYurbrainClient(options);
  let bootstrapPromise: Promise<void> | null = null;

  const ensureNhostBootstrap = async () => {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrapNhostSession().then(() => undefined);
    }
    await bootstrapPromise;
  };

  return new Proxy(baseClient, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        await ensureNhostBootstrap();
        return (value as (...callArgs: unknown[]) => unknown)(...args);
      };
    }
  }) as YurbrainClient;
}

export function createYurbrainClient(options: CreateYurbrainClientOptions = {}): YurbrainClient {
  if (options.transport === "nhost") {
    return createNhostBackedYurbrainClient(options);
  }
  return createRestBackedYurbrainClient(options);
}
