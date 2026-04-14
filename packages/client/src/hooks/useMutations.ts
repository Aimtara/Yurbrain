import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export type NormalizedMutationError = {
  code: "NETWORK" | "VALIDATION" | "NOT_FOUND" | "SERVER" | "UNKNOWN";
  message: string;
};

function normalizeMutationError(error: unknown): NormalizedMutationError {
  const message = error instanceof Error ? error.message : "Unknown error";
  const statusMatch = message.match(/(\d{3})$/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : undefined;

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
  return postJson<T>(endpoints.aiConvert, payload);
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
  if (query.userId) params.set("userId", query.userId);
  if (query.state) params.set("state", query.state);
  const rendered = params.toString();
  return withNormalizedErrors(() => apiClient<T>(`${endpoints.sessions}${rendered ? `?${rendered}` : ""}`));
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
