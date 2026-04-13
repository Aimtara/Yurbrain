import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export function useYurbrainApi() {
  return {
    apiClient,
    getFeed: <T>(userId?: string) => apiClient<T>(`${endpoints.feed}${userId ? `?userId=${userId}` : ""}`),
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
    summarizeItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.aiSummarize, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    classifyItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.aiClassify, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
    queryItem: <T>(payload: unknown) =>
      apiClient<T>(endpoints.aiQuery, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      })
  };
}
