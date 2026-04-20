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

type TouchBrainItemResult = {
  id: string;
  title: string;
  rawContent: string;
  status: "active" | "archived";
};

export type YurbrainClient = {
  getAuthMe: YurbrainDomainClient["getAuthMe"];
  dismissFeedCard: YurbrainDomainClient["dismissFeedCard"];
  snoozeFeedCard: YurbrainDomainClient["snoozeFeedCard"];
  refreshFeedCard: YurbrainDomainClient["refreshFeedCard"];
  listBrainItems: YurbrainDomainClient["listBrainItems"];
  updateBrainItem: YurbrainDomainClient["updateBrainItem"];
  createCaptureIntake: YurbrainDomainClient["createCaptureIntake"];
  listBrainItemArtifacts: YurbrainDomainClient["listBrainItemArtifacts"];
  listRelatedBrainItems: YurbrainDomainClient["listRelatedBrainItems"];
  listThreadsByTarget: YurbrainDomainClient["listThreadsByTarget"];
  createThread: YurbrainDomainClient["createThread"];
  listThreadMessages: YurbrainDomainClient["listThreadMessages"];
  sendMessage: YurbrainDomainClient["sendMessage"];
  addMessage: YurbrainDomainClient["addMessage"];
  summarizeBrainItem: YurbrainDomainClient["summarizeBrainItem"];
  summarizeCluster: YurbrainDomainClient["summarizeCluster"];
  summarizeItem: YurbrainDomainClient["summarizeItem"];
  classifyBrainItem: YurbrainDomainClient["classifyBrainItem"];
  classifyItem: YurbrainDomainClient["classifyItem"];
  queryBrainItemThread: YurbrainDomainClient["queryBrainItemThread"];
  queryItem: YurbrainDomainClient["queryItem"];
  requestNextStep: YurbrainDomainClient["requestNextStep"];
  listTasks: YurbrainDomainClient["listTasks"];
  createTask: YurbrainDomainClient["createTask"];
  updateTask: YurbrainDomainClient["updateTask"];
  manualConvertTask: YurbrainDomainClient["manualConvertTask"];
  listSessions: YurbrainDomainClient["listSessions"];
  pauseSession: YurbrainDomainClient["pauseSession"];
  getUserPreference: YurbrainDomainClient["getUserPreference"];
  getUserPreferenceMe: YurbrainDomainClient["getUserPreferenceMe"];
  updateUserPreference: YurbrainDomainClient["updateUserPreference"];
  updateUserPreferenceMe: YurbrainDomainClient["updateUserPreferenceMe"];
  getFeedRanked: YurbrainDomainClient["getFeedRanked"];
  getWhatShouldIDoNext: YurbrainDomainClient["getWhatShouldIDoNext"];
  getFounderReviewScored: YurbrainDomainClient["getFounderReviewScored"];
  runSessionHelper: YurbrainDomainClient["runSessionHelper"];
  getCurrentUser: <T = { id: string; source: string }>() => Promise<T>;
  setFounderMode: <T = unknown>(enabled: boolean) => Promise<T>;
  setDefaultFeedLens: <T = unknown>(lens: string) => Promise<T>;
  getFeed: <T>(query?: FeedQuery) => Promise<T>;
  createBrainItem: <T>(payload: unknown) => Promise<T>;
  getBrainItem: <T>(itemId: string) => Promise<T>;
  touchBrainItem: <T = unknown>(itemId: string) => Promise<T>;
  addComment: <T>(threadId: string, content: string) => Promise<T>;
  planThis: <T>(payload: unknown) => Promise<T>;
  startSession: <T>(taskId: string) => Promise<T>;
  finishSession: <T>(sessionId: string) => Promise<T>;
  blockSession: <T>(sessionId: string, reason?: string) => Promise<T>;
  summarizeProgress: <T>(payload: { itemIds: string[] }) => Promise<T>;
  getNextStep: <T>(payload: { itemIds: string[] }) => Promise<T>;
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
    ...domainClient,
    getCurrentUser: () => domainClient.getAuthMe(),
    setFounderMode: (enabled) =>
      domainClient.updateUserPreferenceMe({
        founderMode: enabled
      }),
    setDefaultFeedLens: (lens) =>
      domainClient.updateUserPreferenceMe({
        defaultLens: lens
      }),
    getFeed: (query = {}) => domainClient.getFeed(query),
    createBrainItem: (payload) => domainClient.createBrainItem(payload),
    getBrainItem: (itemId) => domainClient.getBrainItem(itemId),
    touchBrainItem: async (itemId) => {
      const existing = await domainClient.getBrainItem<TouchBrainItemResult>(itemId);
      return domainClient.updateBrainItem(itemId, {
        title: existing.title,
        rawContent: existing.rawContent,
        status: existing.status
      });
    },
    addComment: (threadId, content) => domainClient.addComment(threadId, content),
    planThis: (payload) => domainClient.planThis(payload),
    startSession: (taskId) => domainClient.startSession(taskId),
    finishSession: (sessionId) => domainClient.finishSession(sessionId),
    blockSession: (sessionId) => domainClient.pauseSession(sessionId),
    summarizeProgress: (payload) => domainClient.summarizeProgress(payload),
    getNextStep: (payload) => domainClient.getWhatShouldIDoNext(payload),
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
