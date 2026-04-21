import { apiClient } from "../api/client";
import { endpoints } from "../api/endpoints";
import {
  classifyBrainItem as classifyBrainItemQuery,
  getAuthMe,
  getBrainItem,
  getBrainItemNextStep,
  listBrainItemArtifacts,
  listRelatedBrainItems,
  listThreadMessages,
  listThreadsByTarget,
  queryBrainItemThread as queryBrainItemThreadQuery,
  summarizeBrainItem,
  summarizeBrainItemCluster
} from "../hooks/useBrainItem";
import { getFeed } from "../hooks/useFeed";
import {
  classifyItem,
  convertToTask,
  createBrainItem,
  createCaptureIntake,
  createTask,
  createThread,
  dismissFeedCard,
  finishSession,
  getUserPreference,
  getUserPreferenceMe,
  listSessions,
  manualConvertTask,
  pauseSession,
  queryItem,
  refreshFeedCard,
  requestNextStep,
  sendMessage,
  snoozeFeedCard,
  startTaskSession,
  summarizeCluster,
  summarizeItem,
  updateTask,
  updateUserPreference,
  updateUserPreferenceMe
} from "../hooks/useMutations";
import {
  createTaskGraphql,
  createThreadGraphql,
  getBrainItemGraphql,
  getUserPreferenceGraphql,
  getUserPreferenceMeGraphql,
  listBrainItemArtifactsGraphql,
  listBrainItemsGraphql,
  listSessionsGraphql,
  listTasksGraphql,
  listThreadMessagesGraphql,
  listThreadsByTargetGraphql,
  sendMessageGraphql,
  updateBrainItemGraphql,
  updateTaskGraphql,
  updateUserPreferenceGraphql,
  updateUserPreferenceMeGraphql
} from "../graphql/crud-adapter";
import { isHasuraGraphqlConfigured } from "../graphql/hasura-client";

type FeedQuery = {
  lens?: string;
  limit?: number;
  includeSnoozed?: boolean;
};

type TaskListQuery = {
  status?: "todo" | "in_progress" | "done";
  userId?: string;
};

type FounderReviewQuery = {
  window?: "7d";
  userId?: string;
  includeAi?: boolean;
};

type FunctionFeedQuery = FeedQuery;

type FunctionSessionHelperPayload = {
  action: "start" | "pause" | "finish";
  taskId?: string;
  sessionId?: string;
};

function renderQuery(
  query: Record<string, string | number | boolean | null | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

export type YurbrainDomainClient = {
  getAuthMe: <T>() => Promise<T>;
  getFeed: <T>(query?: FeedQuery) => Promise<T>;
  dismissFeedCard: <T>(cardId: string) => Promise<T>;
  snoozeFeedCard: <T>(cardId: string, minutes?: number) => Promise<T>;
  refreshFeedCard: <T>(cardId: string) => Promise<T>;
  listBrainItems: <T>() => Promise<T>;
  getBrainItem: <T>(itemId: string) => Promise<T>;
  createBrainItem: <T>(payload: unknown) => Promise<T>;
  updateBrainItem: <T>(itemId: string, payload: unknown) => Promise<T>;
  createCaptureIntake: <T>(payload: unknown) => Promise<T>;
  listBrainItemArtifacts: <T>(
    itemId: string,
    type?: "summary" | "classification" | "relation" | "feed_card"
  ) => Promise<T>;
  listRelatedBrainItems: <T>(itemId: string) => Promise<T>;
  listThreadsByTarget: <T>(itemId: string) => Promise<T>;
  createThread: <T>(payload: unknown) => Promise<T>;
  listThreadMessages: <T>(threadId: string) => Promise<T>;
  sendMessage: <T>(payload: unknown) => Promise<T>;
  addMessage: <T>(payload: unknown) => Promise<T>;
  addComment: <T>(threadId: string, content: string) => Promise<T>;
  summarizeBrainItem: <T>(payload: {
    itemId: string;
    rawContent: string;
    timeoutMs?: number;
  }) => Promise<T>;
  summarizeCluster: <T>(payload: { itemIds: string[] }) => Promise<T>;
  summarizeItem: <T>(payload: unknown) => Promise<T>;
  classifyBrainItem: <T>(payload: {
    itemId: string;
    rawContent: string;
    timeoutMs?: number;
  }) => Promise<T>;
  classifyItem: <T>(payload: unknown) => Promise<T>;
  queryBrainItemThread: <T>(payload: {
    threadId: string;
    question: string;
    timeoutMs?: number;
  }) => Promise<T>;
  queryItem: <T>(payload: unknown) => Promise<T>;
  getNextStep: <T>(payload: { itemIds: string[] }) => Promise<T>;
  requestNextStep: <T>(payload: unknown) => Promise<T>;
  listTasks: <T>(query?: TaskListQuery) => Promise<T>;
  createTask: <T>(payload: unknown) => Promise<T>;
  updateTask: <T>(taskId: string, payload: unknown) => Promise<T>;
  manualConvertTask: <T>(payload: unknown) => Promise<T>;
  planThis: <T>(payload: unknown) => Promise<T>;
  listSessions: <T>(query: {
    taskId?: string;
    userId?: string;
    state?: "running" | "paused" | "finished";
  }) => Promise<T>;
  startSession: <T>(taskId: string) => Promise<T>;
  pauseSession: <T>(sessionId: string) => Promise<T>;
  finishSession: <T>(sessionId: string) => Promise<T>;
  getUserPreference: <T>(userId: string) => Promise<T>;
  getUserPreferenceMe: <T>() => Promise<T>;
  updateUserPreference: <T>(userId: string, payload: unknown) => Promise<T>;
  updateUserPreferenceMe: <T>(payload: unknown) => Promise<T>;
  getFounderReview: <T>(query?: FounderReviewQuery) => Promise<T>;
  getFeedRanked: <T>(query?: FunctionFeedQuery) => Promise<T>;
  summarizeProgress: <T>(payload: { itemIds: string[] }) => Promise<T>;
  getWhatShouldIDoNext: <T>(payload: { itemIds: string[] }) => Promise<T>;
  getFounderReviewScored: <T>(query?: FounderReviewQuery) => Promise<T>;
  runSessionHelper: <T>(payload: FunctionSessionHelperPayload) => Promise<T>;
};

function createRestDomainClient(): YurbrainDomainClient {
  return {
    getAuthMe,
    getFeed,
    dismissFeedCard,
    snoozeFeedCard,
    refreshFeedCard,
    listBrainItems: () => apiClient(endpoints.brainItems),
    getBrainItem,
    createBrainItem,
    updateBrainItem: (itemId, payload) =>
      apiClient(`${endpoints.brainItems}/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    createCaptureIntake,
    listBrainItemArtifacts,
    listRelatedBrainItems,
    listThreadsByTarget,
    createThread,
    listThreadMessages,
    sendMessage,
    addMessage: sendMessage,
    addComment: (threadId, content) =>
      sendMessage({ threadId, role: "user", content }),
    summarizeBrainItem,
    summarizeItem,
    summarizeCluster: summarizeBrainItemCluster,
    classifyBrainItem: classifyBrainItemQuery,
    classifyItem,
    queryBrainItemThread: queryBrainItemThreadQuery,
    queryItem,
    getNextStep: getBrainItemNextStep,
    requestNextStep,
    listTasks: (query = {}) =>
      apiClient(`${endpoints.tasks}${renderQuery(query)}`),
    createTask,
    updateTask,
    manualConvertTask,
    planThis: convertToTask,
    listSessions,
    startSession: startTaskSession,
    pauseSession,
    finishSession,
    getUserPreference,
    getUserPreferenceMe,
    updateUserPreference,
    updateUserPreferenceMe,
    getFounderReview: (query = {}) =>
      apiClient(
        `${endpoints.founderReview}${renderQuery({
          window: query.window ?? "7d",
          userId: query.userId,
          includeAi: query.includeAi ? "1" : undefined
        })}`
      ),
    getFeedRanked: (query = {}) => getFeed(query),
    summarizeProgress: (payload) => summarizeCluster(payload),
    getWhatShouldIDoNext: (payload) => requestNextStep(payload),
    getFounderReviewScored: (query = {}) =>
      apiClient(
        `${endpoints.founderReview}${renderQuery({
          window: query.window ?? "7d",
          userId: query.userId,
          includeAi: query.includeAi ? "1" : undefined
        })}`
      ),
    runSessionHelper: async (payload) => {
      if (payload.action === "start") {
        if (!payload.taskId) throw new Error("taskId is required for start");
        return startTaskSession(payload.taskId);
      }
      if (!payload.sessionId) throw new Error("sessionId is required for pause/finish");
      if (payload.action === "pause") {
        return pauseSession(payload.sessionId);
      }
      return finishSession(payload.sessionId);
    }
  };
}

function createFunctionLogicOverrides(restClient: YurbrainDomainClient): Partial<YurbrainDomainClient> {
  return {
    getFeedRanked: (query = {}) =>
      apiClient(`${endpoints.functionFeedRank}${renderQuery(query)}`),
    summarizeProgress: (payload) =>
      apiClient(endpoints.functionSummarizeProgress, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    getWhatShouldIDoNext: (payload) =>
      apiClient(endpoints.functionNextStep, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    getFounderReviewScored: (query = {}) =>
      apiClient(
        `${endpoints.functionFounderReview}${renderQuery({
          window: query.window ?? "7d",
          userId: query.userId,
          includeAi: query.includeAi ? "1" : undefined
        })}`
      ),
    runSessionHelper: (payload) =>
      apiClient(endpoints.functionSessionHelper, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    getFeed: (query = {}) => restClient.getFeedRanked(query),
    summarizeCluster: (payload) => restClient.summarizeProgress(payload),
    requestNextStep: (payload) =>
      restClient.getWhatShouldIDoNext(payload as { itemIds: string[] }),
    getFounderReview: (query = {}) => restClient.getFounderReviewScored(query),
    startSession: (taskId) => restClient.runSessionHelper({ action: "start", taskId }),
    pauseSession: (sessionId) => restClient.runSessionHelper({ action: "pause", sessionId }),
    finishSession: (sessionId) => restClient.runSessionHelper({ action: "finish", sessionId })
  };
}

const restDomainClient = createRestDomainClient();

function createGraphqlCrudOverrides(restClient: YurbrainDomainClient): Partial<YurbrainDomainClient> {
  const useGraphql = () => isHasuraGraphqlConfigured();

  return {
    listBrainItems: () => (useGraphql() ? listBrainItemsGraphql() : restClient.listBrainItems()),
    getBrainItem: (itemId) => (useGraphql() ? getBrainItemGraphql(itemId) : restClient.getBrainItem(itemId)),
    updateBrainItem: (itemId, payload) =>
      useGraphql() ? updateBrainItemGraphql(itemId, payload) : restClient.updateBrainItem(itemId, payload),
    listBrainItemArtifacts: (itemId, type) =>
      useGraphql() ? listBrainItemArtifactsGraphql(itemId, type) : restClient.listBrainItemArtifacts(itemId, type),
    listThreadsByTarget: (itemId) => (useGraphql() ? listThreadsByTargetGraphql(itemId) : restClient.listThreadsByTarget(itemId)),
    createThread: (payload) => (useGraphql() ? createThreadGraphql(payload) : restClient.createThread(payload)),
    listThreadMessages: (threadId) => (useGraphql() ? listThreadMessagesGraphql(threadId) : restClient.listThreadMessages(threadId)),
    sendMessage: (payload) => (useGraphql() ? sendMessageGraphql(payload) : restClient.sendMessage(payload)),
    addMessage: (payload) => (useGraphql() ? sendMessageGraphql(payload) : restClient.addMessage(payload)),
    addComment: (threadId, content) =>
      useGraphql()
        ? sendMessageGraphql({ threadId, role: "user", content })
        : restClient.addComment(threadId, content),
    listTasks: (query = {}) => (useGraphql() ? listTasksGraphql(query) : restClient.listTasks(query)),
    createTask: (payload) => (useGraphql() ? createTaskGraphql(payload) : restClient.createTask(payload)),
    updateTask: (taskId, payload) => (useGraphql() ? updateTaskGraphql(taskId, payload) : restClient.updateTask(taskId, payload)),
    listSessions: (query) => (useGraphql() ? listSessionsGraphql(query) : restClient.listSessions(query)),
    getUserPreference: (userId) => (useGraphql() ? getUserPreferenceGraphql(userId) : restClient.getUserPreference(userId)),
    getUserPreferenceMe: () => (useGraphql() ? getUserPreferenceMeGraphql() : restClient.getUserPreferenceMe()),
    updateUserPreference: (userId, payload) =>
      useGraphql() ? updateUserPreferenceGraphql(userId, payload) : restClient.updateUserPreference(userId, payload),
    updateUserPreferenceMe: (payload) =>
      useGraphql() ? updateUserPreferenceMeGraphql(payload) : restClient.updateUserPreferenceMe(payload)
  };
}

const graphqlCrudOverrides = createGraphqlCrudOverrides(restDomainClient);
const functionLogicOverrides = createFunctionLogicOverrides(restDomainClient);

export function createYurbrainDomainClient(
  overrides: Partial<YurbrainDomainClient> = {}
): YurbrainDomainClient {
  // Method-level overrides make incremental GraphQL/Function cutovers simple.
  return {
    ...restDomainClient,
    ...graphqlCrudOverrides,
    ...functionLogicOverrides,
    ...overrides
  };
}

export const yurbrainDomainClient = createYurbrainDomainClient();
