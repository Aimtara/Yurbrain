import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

type FeedQuery = {
  lens?: string;
  limit?: number;
  includeSnoozed?: boolean;
};

function buildFeedQuery(query: FeedQuery = {}) {
  const params = new URLSearchParams();
  if (query.lens) params.set("lens", query.lens);
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.includeSnoozed === "boolean") params.set("includeSnoozed", String(query.includeSnoozed));
  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

export function useYurbrainApi() {
  return {
    apiClient,
    getFeed: <T>(query: FeedQuery = {}) => apiClient<T>(`${endpoints.feed}${buildFeedQuery(query)}`),
    dismissFeedCard: <T>(id: string) =>
      apiClient<T>(`/feed/${id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
    snoozeFeedCard: <T>(id: string, minutes = 60) =>
      apiClient<T>(`/feed/${id}/snooze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes })
      }),
    refreshFeedCard: <T>(id: string) =>
      apiClient<T>(`/feed/${id}/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
    createThread: <T>(payload: unknown) =>
      apiClient<T>(endpoints.threads, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    sendMessage: <T>(payload: unknown) =>
      apiClient<T>(endpoints.messages, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    manualConvertTask: <T>(payload: unknown) =>
      apiClient<T>(endpoints.manualConvertTask, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    convertToTask: <T>(payload: unknown) =>
      apiClient<T>(endpoints.functionConvert, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    createTask: <T>(payload: unknown) =>
      apiClient<T>(endpoints.tasks, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    updateTask: <T>(id: string, payload: unknown) =>
      apiClient<T>(`${endpoints.tasks}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    startTaskSession: <T>(taskId: string) =>
      apiClient<T>(`${endpoints.tasks}/${taskId}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
    pauseSession: <T>(sessionId: string) =>
      apiClient<T>(`/sessions/${sessionId}/pause`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
    finishSession: <T>(sessionId: string) =>
      apiClient<T>(`/sessions/${sessionId}/finish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
    summarizeItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.functionSummarizeItem, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    classifyItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.functionClassifyItem, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    queryItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.functionQueryItem, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    summarizeCluster: <T>(payload: { itemIds: string[] }) =>
      apiClient<T>(endpoints.functionSummarizeProgress, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    getNextStep: <T>(payload: { itemIds: string[] }) =>
      apiClient<T>(endpoints.functionNextStep, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    getUserPreference: <T>(userId?: string) =>
      userId ? apiClient<T>(`${endpoints.preferences}/${encodeURIComponent(userId)}`) : apiClient<T>(endpoints.preferencesMe),
    updateUserPreference: <T>(first: string | unknown, second?: unknown) =>
      apiClient<T>(typeof first === "string" ? `${endpoints.preferences}/${encodeURIComponent(first)}` : endpoints.preferencesMe, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(typeof first === "string" ? second : first)
      }),
    listBrainItemArtifacts: <T>(itemId: string, type?: "summary" | "classification" | "relation" | "feed_card") =>
      apiClient<T>(`${endpoints.brainItems}/${itemId}/artifacts${type ? `?type=${encodeURIComponent(type)}` : ""}`)
  };
}
