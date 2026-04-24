import { endpoints } from "../api/endpoints";
import { apiClient, isApiClientError } from "../api/client";
import { getCurrentUserId } from "../auth/current-user";

export type NormalizedMutationError = {
  code: "NETWORK" | "VALIDATION" | "NOT_FOUND" | "SERVER" | "UNKNOWN";
  message: string;
};

function normalizeMutationError(error: unknown): NormalizedMutationError {
  const statusCode = isApiClientError(error) ? error.statusCode : undefined;

  if (!statusCode) {
    return { code: "NETWORK", message: "Could not reach server. Check your connection and retry." };
  }
  if (statusCode === 400) return { code: "VALIDATION", message: "Please review your input and try again." };
  if (statusCode === 404) return { code: "NOT_FOUND", message: "The requested resource no longer exists." };
  if (statusCode >= 500) return { code: "SERVER", message: "Server error. Please retry in a moment." };
  return { code: "UNKNOWN", message: `Request failed (${statusCode}).` };
}

async function withNormalizedErrors<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const normalized = normalizeMutationError(error);
    throw Object.assign(new Error(normalized.message), { normalized });
  }
}

function postJson<T>(url: string, payload: unknown) {
  return withNormalizedErrors(() =>
    apiClient<T>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

function patchJson<T>(url: string, payload: unknown) {
  return withNormalizedErrors(() =>
    apiClient<T>(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function createBrainItem<T>(payload: unknown) {
  return postJson<T>(endpoints.brainItems, payload);
}

export async function createCaptureIntake<T>(payload: unknown) {
  return postJson<T>(endpoints.captureIntake, payload);
}

type ListBrainItemsSearchQuery = {
  q?: string;
  type?: "note" | "link" | "idea" | "quote" | "file";
  tag?: string;
  createdFrom?: string;
  createdTo?: string;
  status?: "active" | "archived";
  processingStatus?: "processed" | "pending";
  limit?: number;
};

export async function listBrainItemsWithSearch<T>(query: ListBrainItemsSearchQuery = {}) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.type) params.set("type", query.type);
  if (query.tag?.trim()) params.set("tag", query.tag.trim());
  if (query.createdFrom?.trim()) params.set("createdFrom", query.createdFrom.trim());
  if (query.createdTo?.trim()) params.set("createdTo", query.createdTo.trim());
  if (query.status) params.set("status", query.status);
  if (query.processingStatus) params.set("processingStatus", query.processingStatus);
  if (typeof query.limit === "number" && Number.isFinite(query.limit)) {
    params.set("limit", String(Math.max(1, Math.min(200, Math.trunc(query.limit)))));
  }
  const rendered = params.toString();
  return withNormalizedErrors(() =>
    apiClient<T>(`${endpoints.brainItemsSearch}${rendered ? `?${rendered}` : ""}`)
  );
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

export async function convertToTask<T>(payload: unknown) {
  return postJson<T>(endpoints.functionConvert, payload);
}

export async function createTask<T>(payload: unknown) {
  return postJson<T>(endpoints.tasks, payload);
}

export async function updateTask<T>(id: string, payload: unknown) {
  return patchJson<T>(`${endpoints.tasks}/${id}`, payload);
}

export async function startTaskSession<T>(taskId: string) {
  return postJson<T>(`${endpoints.tasks}/${taskId}/start`, {});
}

export async function pauseSession<T>(sessionId: string) {
  return postJson<T>(`/sessions/${sessionId}/pause`, {});
}

export async function finishSession<T>(sessionId: string) {
  return postJson<T>(`/sessions/${sessionId}/finish`, {});
}

export async function listSessions<T>(query: { taskId?: string; userId?: string; state?: "running" | "paused" | "finished" }) {
  const params = new URLSearchParams();
  if (query.taskId) params.set("taskId", query.taskId);
  if (query.userId && query.userId !== getCurrentUserId()) params.set("userId", query.userId);
  if (query.state) params.set("state", query.state);
  const rendered = params.toString();
  return withNormalizedErrors(() => apiClient<T>(`${endpoints.sessions}${rendered ? `?${rendered}` : ""}`));
}

export async function summarizeItem<T>(payload: unknown) {
  return postJson<T>(endpoints.functionSummarizeItem, payload);
}

export async function summarizeCluster<T>(payload: unknown) {
  return postJson<T>(endpoints.functionSummarizeProgress, payload);
}

export async function classifyItem<T>(payload: unknown) {
  return postJson<T>(endpoints.functionClassifyItem, payload);
}

export async function queryItem<T>(payload: unknown) {
  return postJson<T>(endpoints.functionQueryItem, payload);
}

export async function requestNextStep<T>(payload: unknown) {
  return postJson<T>(endpoints.functionNextStep, payload);
}

export async function getUserPreference<T>(userId: string) {
  return withNormalizedErrors(() => apiClient<T>(`${endpoints.preferences}/${encodeURIComponent(userId)}`));
}

export async function getUserPreferenceMe<T>() {
  return withNormalizedErrors(() => apiClient<T>(endpoints.preferencesMe));
}

export async function updateUserPreference<T>(userId: string, payload: unknown) {
  return withNormalizedErrors(() =>
    apiClient<T>(`${endpoints.preferences}/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

export async function updateUserPreferenceMe<T>(payload: unknown) {
  return withNormalizedErrors(() =>
    apiClient<T>(endpoints.preferencesMe, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
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
