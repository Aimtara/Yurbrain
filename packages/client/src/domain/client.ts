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
      )
  };
}

const restDomainClient = createRestDomainClient();

export function createYurbrainDomainClient(
  overrides: Partial<YurbrainDomainClient> = {}
): YurbrainDomainClient {
  // Method-level overrides make incremental GraphQL/Function cutovers simple.
  return {
    ...restDomainClient,
    ...overrides
  };
}

export const yurbrainDomainClient = createYurbrainDomainClient();
