import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function getBrainItem<T>(id: string) {
  return apiClient<T>(`${endpoints.brainItems}/${id}`);
}

export async function listThreadsByTarget<T>(targetItemId: string) {
  return apiClient<T>(`${endpoints.threads}/by-target?targetItemId=${encodeURIComponent(targetItemId)}`);
}

export async function listThreadMessages<T>(threadId: string) {
  return apiClient<T>(`${endpoints.threads}/${threadId}/messages`);
}

export async function listBrainItemArtifacts<T>(itemId: string, type?: "summary" | "classification" | "relation" | "feed_card") {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiClient<T>(`${endpoints.brainItems}/${itemId}/artifacts${query}`);
}

export async function listRelatedBrainItems<T>(itemId: string) {
  return apiClient<T>(`${endpoints.brainItems}/${itemId}/related`);
}

export async function summarizeBrainItem<T>(payload: { itemId: string; rawContent: string; timeoutMs?: number }) {
  return apiClient<T>(endpoints.aiSummarize, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function classifyBrainItem<T>(payload: { itemId: string; rawContent: string; timeoutMs?: number }) {
  return apiClient<T>(endpoints.aiClassify, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function queryBrainItemThread<T>(payload: { threadId: string; question: string; timeoutMs?: number }) {
  return apiClient<T>(endpoints.aiQuery, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function summarizeBrainItemCluster<T>(payload: { itemIds: string[] }) {
  return apiClient<T>(endpoints.aiSummarizeCluster, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getBrainItemNextStep<T>(payload: { itemIds: string[] }) {
  return apiClient<T>(endpoints.aiNextStep, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}
