import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

function postJson<T>(url: string, payload: unknown) {
  return apiClient<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function createBrainItem<T>(payload: unknown) {
  return postJson<T>(endpoints.brainItems, payload);
}

export async function createThread<T>(payload: unknown) {
  return postJson<T>(endpoints.threads, payload);
}

export async function sendMessage<T>(payload: unknown) {
  return postJson<T>(endpoints.messages, payload);
}

export async function manualConvertTask<T>(payload: unknown) {
  return postJson<T>(endpoints.manualConvertTask, payload);
}

export async function summarizeItem<T>(payload: unknown) {
  return postJson<T>(endpoints.aiSummarize, payload);
}

export async function classifyItem<T>(payload: unknown) {
  return postJson<T>(endpoints.aiClassify, payload);
}

export async function queryItem<T>(payload: unknown) {
  return postJson<T>(endpoints.aiQuery, payload);
}

export async function dismissFeedCard<T>(id: string) {
  return postJson<T>(`/feed/${id}/dismiss`, {});
}

export async function snoozeFeedCard<T>(id: string, minutes = 60) {
  return postJson<T>(`/feed/${id}/snooze`, { minutes });
}

export async function refreshFeedCard<T>(id: string) {
  return postJson<T>(`/feed/${id}/refresh`, {});
}
